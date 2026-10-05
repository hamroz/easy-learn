import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { courses, lessons, sections, users } from "@/server/db/schema";
import { importExamples } from "@/server/services/examples";
import { resetDb } from "../helpers/db";

const DIR = fileURLToPath(new URL("../fixtures/examples", import.meta.url));
let userId: string;

beforeAll(runMigrations);
beforeEach(async () => {
  await resetDb();
  const [u] = await db.insert(users).values({ email: "o@example.test", passwordHash: "x" }).returning();
  userId = u.id;
});
afterAll(closeDb);

describe("importExamples", () => {
  it("imports courses as active examples with written and planned lessons", async () => {
    expect(await importExamples(userId, DIR)).toBe(1);
    const [c] = await db.select().from(courses);
    expect(c).toMatchObject({ title: "Tiny example", isExample: true, status: "active" });
    expect(c.theme?.fontPair).toBe("modern");
    const ls = await db.select().from(lessons).where(eq(lessons.courseId, c.id)).orderBy(asc(lessons.position));
    expect(ls.map((l) => [l.title, l.status])).toEqual([
      ["Written", "ready"],
      ["Planned", "planned"],
    ]);
    const secs = await db.select().from(sections).where(eq(sections.lessonId, ls[0].id)).orderBy(asc(sections.position));
    expect(secs.map((s) => s.blocks.map((b) => b.id))).toEqual([["s0p1"], ["s1p1"], ["s2p1"]]);
  });

  it("does not import the same example twice", async () => {
    await importExamples(userId, DIR);
    expect(await importExamples(userId, DIR)).toBe(0);
    expect(await db.select().from(courses)).toHaveLength(1);
  });

  it("returns 0 when the folder does not exist", async () => {
    expect(await importExamples(userId, "/nonexistent/examples")).toBe(0);
  });
});

describe("shipped examples", () => {
  it("every file in examples/ is valid and loses no blocks on import", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const { exampleFileSchema } = await import("@/server/services/examples");
    const { parseBlocksLenient } = await import("@/content/blocks");
    const dir = fileURLToPath(new URL("../../examples", import.meta.url));
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const f of files) {
      const ex = exampleFileSchema.parse(JSON.parse(await readFile(`${dir}/${f}`, "utf8")));
      for (const l of ex.lessons) for (const s of l.sections) expect(parseBlocksLenient(s.blocks).length, `${f}: ${s.heading}`).toBe(s.blocks.length);
    }
  });
});
