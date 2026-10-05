import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { lessons, messages, sections, users } from "@/server/db/schema";
import { createSessionToken } from "@/server/auth/session";
import { runJobsUntilIdle } from "@/server/jobs/runner";
import { GET as listCourses, POST as createCourseRoute } from "@/app/api/courses/route";
import { DELETE as deleteCourse, GET as getCourse } from "@/app/api/courses/[id]/route";
import { PUT as putLessons } from "@/app/api/courses/[id]/lessons/route";
import { POST as startRoute } from "@/app/api/courses/[id]/start/route";
import { GET as getLesson } from "@/app/api/lessons/[id]/route";
import { POST as variantRoute } from "@/app/api/variants/route";
import { POST as createThread } from "@/app/api/threads/route";
import { POST as postMessage } from "@/app/api/threads/[id]/messages/route";
import { POST as quizRoute } from "@/app/api/lessons/[id]/quiz/route";
import { GET as getSettings, PUT as putSettings } from "@/app/api/settings/route";
import { resetDb } from "../helpers/db";

const ORIGIN = "http://localhost:3000";
let cookie = "";
let otherCookie = "";

function req(method: string, path: string, body?: unknown, c = cookie) {
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN, cookie: c },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function readyCourse() {
  const res = await createCourseRoute(req("POST", "/api/courses", { topic: "Relativity", level: "beginner" }));
  const { course } = await res.json();
  await runJobsUntilIdle();
  await startRoute(req("POST", `/api/courses/${course.id}/start`, {}), params(course.id));
  await runJobsUntilIdle();
  const [first] = await db.select().from(lessons).where(eq(lessons.courseId, course.id)).orderBy(asc(lessons.position));
  const [sec] = await db.select().from(sections).where(eq(sections.lessonId, first.id)).orderBy(asc(sections.position));
  return { courseId: course.id as string, lessonId: first.id, section: sec };
}

beforeAll(runMigrations);
beforeEach(async () => {
  await resetDb();
  process.env.APP_ORIGIN = ORIGIN;
  const [u] = await db.insert(users).values({ email: "owner@example.test", passwordHash: "x" }).returning();
  const [o] = await db.insert(users).values({ email: "other@example.test", passwordHash: "x" }).returning();
  cookie = `el_session=${(await createSessionToken(u.id)).token}`;
  otherCookie = `el_session=${(await createSessionToken(o.id)).token}`;
});
afterAll(closeDb);

describe("API", () => {
  it("401s without a session", async () => {
    expect((await listCourses(req("GET", "/api/courses", undefined, ""))).status).toBe(401);
  });

  it("creates a course and lists it", async () => {
    const res = await createCourseRoute(req("POST", "/api/courses", { topic: "Black holes", level: "beginner" }));
    expect(res.status).toBe(200);
    const list = await (await listCourses(req("GET", "/api/courses"))).json();
    expect(list.courses).toHaveLength(1);
    expect(list.courses[0].status).toBe("outlining");
  });

  it("rejects empty topics", async () => {
    expect((await createCourseRoute(req("POST", "/api/courses", { topic: "   ", level: "beginner" }))).status).toBe(400);
  });

  it("hides other users' courses (404)", async () => {
    const { courseId } = await readyCourse();
    expect((await getCourse(req("GET", `/api/courses/${courseId}`, undefined, otherCookie), params(courseId))).status).toBe(404);
    expect((await deleteCourse(req("DELETE", `/api/courses/${courseId}`, undefined, otherCookie), params(courseId))).status).toBe(404);
  });

  it("edits the outline before starting", async () => {
    const res = await createCourseRoute(req("POST", "/api/courses", { topic: "Relativity", level: "beginner" }));
    const { course } = await res.json();
    await runJobsUntilIdle();
    const put = await putLessons(
      req("PUT", `/api/courses/${course.id}/lessons`, { lessons: [{ title: "One", summary: "a" }, { title: "Two", summary: "b" }] }),
      params(course.id),
    );
    expect(put.status).toBe(200);
    const view = await (await getCourse(req("GET", `/api/courses/${course.id}`), params(course.id))).json();
    expect(view.lessons.map((l: { title: string }) => l.title)).toEqual(["One", "Two"]);
  });

  it("returns a lesson view with sections, threads and navigation", async () => {
    const { lessonId } = await readyCourse();
    const view = await (await getLesson(req("GET", `/api/lessons/${lessonId}`), params(lessonId))).json();
    expect(view.lesson.status).toBe("ready");
    expect(view.sections).toHaveLength(4);
    expect(view.course.theme).toBeTruthy();
    expect(view.nav.next).toBeTruthy();
  });

  it("creates a paragraph variant once and reuses it", async () => {
    const { section } = await readyCourse();
    const blockId = section.blocks.find((b) => b.type === "paragraph")!.id;
    const body = { sectionId: section.id, blockId, kind: "simpler" };
    const a = await (await variantRoute(req("POST", "/api/variants", body))).json();
    const b = await (await variantRoute(req("POST", "/api/variants", body))).json();
    expect(a.variant.md).toContain("simpler");
    expect(b.variant.id).toBe(a.variant.id);
  });

  it("streams a thread answer over SSE and persists both messages", async () => {
    const { lessonId, section } = await readyCourse();
    const blockId = section.blocks.find((b) => b.type === "paragraph")!.id;
    const t = await createThread(
      req("POST", "/api/threads", { lessonId, sectionId: section.id, blockId, anchor: { start: 0, end: 7, quote: "Imagine", prefix: "", suffix: " you" } }),
    );
    const { thread } = await t.json();
    const res = await postMessage(req("POST", `/api/threads/${thread.id}/messages`, { content: "What does this mean?" }), params(thread.id));
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    expect(text).toContain("event: delta");
    expect(text).toContain("event: done");
    const rows = await db.select().from(messages).where(eq(messages.threadId, thread.id)).orderBy(asc(messages.createdAt));
    expect(rows.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(rows[1].content).toContain("Imagine");
  });

  it("generates a quiz only when asked", async () => {
    const { lessonId } = await readyCourse();
    const res = await quizRoute(req("POST", `/api/lessons/${lessonId}/quiz`, {}), params(lessonId));
    const { quiz } = await res.json();
    expect(quiz.content.questions.length).toBeGreaterThanOrEqual(3);
  });

  it("saves settings", async () => {
    await putSettings(req("PUT", "/api/settings", { provider: "mock", lessonModel: "x-model", chatModel: "", language: "ru" }));
    const s = await (await getSettings(req("GET", "/api/settings"))).json();
    expect(s.settings).toMatchObject({ provider: "mock", lessonModel: "x-model", chatModel: null, language: "ru" });
  });
});
