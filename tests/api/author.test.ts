import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { courses, jobs, lessons, sections, users } from "@/server/db/schema";
import { issueAuthorToken } from "@/server/services/settingsView";
import { POST as authorCourse } from "@/app/api/author/courses/route";
import { resetDb } from "../helpers/db";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/examples/tiny.json", import.meta.url), "utf8"));
let token = "";
let userId = "";

const post = (body: unknown, auth = `Bearer ${token}`) =>
  new Request("http://localhost:3000/api/author/courses", {
    method: "POST",
    headers: { "content-type": "application/json", ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  });

beforeAll(runMigrations);
beforeEach(async () => {
  await resetDb();
  process.env.APP_ORIGIN = "http://localhost:3000";
  const [u] = await db.insert(users).values({ email: "o@example.test", passwordHash: "x" }).returning();
  userId = u.id;
  token = await issueAuthorToken(u.id);
});
afterAll(closeDb);

describe("authoring API", () => {
  it("rejects requests without a valid token", async () => {
    expect((await authorCourse(post(fixture, ""))).status).toBe(401);
    expect((await authorCourse(post(fixture, "Bearer el_wrong"))).status).toBe(401);
  });

  it("rejects malformed courses with the problems listed, writing nothing", async () => {
    const bad = structuredClone(fixture);
    bad.lessons[0].sections[0].blocks = [{ type: "plot", id: "w", x: { min: 0, max: 1 }, y: { min: 0, max: 1 }, curves: [{ expr: "1" }] }];
    const res = await authorCourse(post(bad));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.join(" ")).toMatch(/depends on x/);
    expect(await db.select().from(courses)).toHaveLength(0);
  });

  it("creates an active course owned by the token's user; outline-only lessons stay planned", async () => {
    const doc = structuredClone(fixture);
    delete doc.lessons[0].plan; // plans are optional for authored courses
    doc.lessons[0].sections[1].blocks.pop(); // drop the fixture's deliberately unknown block
    const res = await authorCourse(post(doc));
    expect(res.status).toBe(200);
    const { id, url } = await res.json();
    expect(url).toBe(`http://localhost:3000/courses/${id}`);
    const [c] = await db.select().from(courses).where(eq(courses.id, id));
    expect(c).toMatchObject({ userId, status: "active", isExample: false });
    const ls = await db.select().from(lessons).where(eq(lessons.courseId, id)).orderBy(asc(lessons.position));
    expect(ls.map((l) => l.status)).toEqual(["ready", "planned"]);
    expect(ls[0].plan?.sections.map((s) => s.heading)).toEqual(["One", "Two", "Three"]);
    expect(await db.select().from(sections).where(eq(sections.lessonId, ls[0].id))).toHaveLength(3);
  });

  it("asks the platform to draw a cover when none is given", async () => {
    const doc = structuredClone(fixture);
    delete doc.course.coverSvg;
    doc.lessons[0].sections[1].blocks.pop();
    const { id } = await (await authorCourse(post(doc))).json();
    const covers = (await db.select().from(jobs)).filter((j) => j.type === "cover" && j.payload.courseId === id);
    expect(covers).toHaveLength(1);
  });
});
