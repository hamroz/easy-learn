import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { courses, jobs, lessons, sections, users } from "@/server/db/schema";
import { runJobsUntilIdle } from "@/server/jobs/runner";
import {
  createCourse,
  openLesson,
  reshapeOutline,
  retrySection,
  startCourse,
  steerCourse,
} from "@/server/services/generation";
import { resetDb } from "../helpers/db";
import { vi } from "vitest";
import { MockProvider } from "@/server/ai/mock";
import { ensureLessonGenerating } from "@/server/services/generation";
import { setEnabledFonts } from "@/server/services/settings";
import type { BlockOf } from "@/content/blocks";

let userId: string;

beforeAll(runMigrations);
beforeEach(async () => {
  await resetDb();
  const [u] = await db.insert(users).values({ email: "owner@example.test", passwordHash: "x" }).returning();
  userId = u.id;
});
afterAll(closeDb);

async function lessonsOf(courseId: string) {
  return db.select().from(lessons).where(eq(lessons.courseId, courseId)).orderBy(asc(lessons.position));
}

describe("generation pipeline (mock provider)", () => {
  it("creates an outline with a normalised theme, lessons and a sanitised cover", async () => {
    const course = await createCourse(userId, { topic: "Special relativity", level: "beginner" });
    expect(course.status).toBe("outlining");
    await runJobsUntilIdle();

    const [c] = await db.select().from(courses).where(eq(courses.id, course.id));
    expect(c.status).toBe("outline_ready");
    expect(c.title).toBe("Special relativity");
    expect(c.theme?.fontPair).toBe("literata"); // mock asks for "editorial"→newsreader, which is not enabled by default
    expect(c.coverSvg).toContain("<svg");
    expect((await lessonsOf(course.id)).map((l) => l.position)).toEqual([0, 1, 2, 3, 4]);
  });

  it("a new course only uses fonts the owner enabled", async () => {
    await setEnabledFonts(userId, ["inter", "plex"]);
    const course = await createCourse(userId, { topic: "Relativity", level: "beginner" });
    await runJobsUntilIdle();
    const [c] = await db.select().from(courses).where(eq(courses.id, course.id));
    expect(c.theme?.fontPair).toBe("inter");
  });

  it("start → first lesson planned, every section written, custom widget code attached; next lesson prefetched", async () => {
    const course = await createCourse(userId, { topic: "Relativity", level: "beginner" });
    await runJobsUntilIdle();
    await startCourse(course.id);
    await runJobsUntilIdle();

    const [first, second] = await lessonsOf(course.id);
    expect(first.status).toBe("ready");
    expect(second.status).toBe("ready");
    const secs = await db.select().from(sections).where(eq(sections.lessonId, first.id)).orderBy(asc(sections.position));
    expect(secs).toHaveLength(4);
    expect(secs.every((s) => s.status === "ready" && s.blocks.length > 0)).toBe(true);

    const custom = secs.flatMap((s) => s.blocks).find((b) => b.type === "custom") as BlockOf<"custom">;
    expect(custom.status).toBe("ready");
    expect(custom.code).toContain("postMessage");
  });

  it("opening a lesson twice enqueues its plan only once", async () => {
    const course = await createCourse(userId, { topic: "Relativity", level: "beginner" });
    await runJobsUntilIdle();
    const [first] = await lessonsOf(course.id);
    await openLesson(first.id);
    await openLesson(first.id);
    const plans = (await db.select().from(jobs)).filter((j) => j.type === "lesson_plan" && j.payload.lessonId === first.id);
    expect(plans).toHaveLength(1);
  });

  it("reshape replaces only lessons that were not generated yet", async () => {
    const course = await createCourse(userId, { topic: "Relativity", level: "beginner" });
    await runJobsUntilIdle();
    await reshapeOutline(course.id, "less math");
    expect((await db.select().from(courses).where(eq(courses.id, course.id)))[0].busy).toBe("reshaping");
    await runJobsUntilIdle();
    const after = await lessonsOf(course.id);
    expect(after.map((l) => l.title)).toEqual(["Reshaped: a gentler start", "Reshaped: the heart of it", "Reshaped: in the real world"]);
    expect((await db.select().from(courses).where(eq(courses.id, course.id)))[0].busy).toBeNull();
  });

  it("steer keeps everything up to the current lesson and rewrites what follows", async () => {
    const course = await createCourse(userId, { topic: "Relativity", level: "beginner" });
    await runJobsUntilIdle();
    await startCourse(course.id);
    await runJobsUntilIdle();
    await steerCourse(course.id, 0, "focus on GPS");
    await runJobsUntilIdle();
    const after = await lessonsOf(course.id);
    expect(after[0].title).toBe("Where the story begins");
    expect(after[1].title).toBe("The key idea"); // already generated (prefetched) → kept
    expect(after.slice(2).map((l) => l.title)).toEqual(["Steered: a gentler start", "Steered: the heart of it", "Steered: in the real world"]);
    expect(after.map((l) => l.position)).toEqual([0, 1, 2, 3, 4]);
  });

  it("a failed section can be retried", async () => {
    const course = await createCourse(userId, { topic: "Relativity", level: "beginner" });
    await runJobsUntilIdle();
    await startCourse(course.id);
    await runJobsUntilIdle();
    const [first] = await lessonsOf(course.id);
    const [sec] = await db.select().from(sections).where(eq(sections.lessonId, first.id)).limit(1);
    await db.update(sections).set({ status: "failed", blocks: [], error: "x" }).where(eq(sections.id, sec.id));
    await retrySection(sec.id);
    await runJobsUntilIdle();
    const [again] = await db.select().from(sections).where(eq(sections.id, sec.id));
    expect(again.status).toBe("ready");
    expect(again.error).toBeNull();
  });

  it("steer never deletes a lesson that started generating while the AI was thinking", async () => {
    const course = await createCourse(userId, { topic: "Relativity", level: "beginner" });
    await runJobsUntilIdle();
    await steerCourse(course.id, 0, "focus on GPS");
    const tail = (await lessonsOf(course.id))[3];
    // The reader opens lesson 4 while the steer call is in flight.
    const original = MockProvider.prototype.complete;
    const spy = vi.spyOn(MockProvider.prototype, "complete").mockImplementation(async function (this: MockProvider, req) {
      if (req.task === "steer") await ensureLessonGenerating(tail.id);
      return original.call(this, req);
    });
    try {
      await runJobsUntilIdle();
    } finally {
      spy.mockRestore();
    }
    const after = await lessonsOf(course.id);
    expect(after.some((l) => l.id === tail.id)).toBe(true);
    expect(after.map((l) => l.position)).toEqual(after.map((_, i) => i));
    expect(after.filter((l) => l.title.startsWith("Steered"))).toHaveLength(3);
  });
});
