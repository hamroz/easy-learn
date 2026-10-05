import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { courses, lessons, sections, users } from "@/server/db/schema";
import { runJobsUntilIdle } from "@/server/jobs/runner";
import { createCourse } from "@/server/services/generation";
import { FORMATS, formatInfo } from "@/content/formats";
import { buildLessonPlanPrompt } from "@/server/ai/prompts/lessonPlan";
import { buildSectionPrompt } from "@/server/ai/prompts/section";
import { buildOutlinePrompt } from "@/server/ai/prompts/outline";
import { resetDb } from "../helpers/db";

let userId: string;
beforeAll(runMigrations);
beforeEach(async () => {
  await resetDb();
  const [u] = await db.insert(users).values({ email: "o@example.test", passwordHash: "x" }).returning();
  userId = u.id;
});
afterAll(closeDb);

const singles = FORMATS.filter((f) => f.id !== "course").map((f) => f.id);

describe("single-page formats (mock provider)", () => {
  it.each(singles)("%s → one lesson, started automatically, sections within bounds", async (format) => {
    const course = await createCourse(userId, { topic: "Atoms", level: "beginner", format });
    await runJobsUntilIdle();
    const [c] = await db.select().from(courses).where(eq(courses.id, course.id));
    expect(c).toMatchObject({ format, status: "active" });
    const ls = await db.select().from(lessons).where(eq(lessons.courseId, course.id));
    expect(ls).toHaveLength(1);
    expect(ls[0].status).toBe("ready");
    const secs = await db.select().from(sections).where(eq(sections.lessonId, ls[0].id)).orderBy(asc(sections.position));
    const [min, max] = formatInfo(format).sections;
    expect(secs.length).toBeGreaterThanOrEqual(min);
    expect(secs.length).toBeLessThanOrEqual(max);
    const types = secs.flatMap((s) => s.blocks.map((b) => b.type));
    if (format === "map") expect(types).toContain("conceptMap");
    if (format === "playground") expect(types).toContain("custom");
  });

  it("courses keep their outline step", async () => {
    const course = await createCourse(userId, { topic: "Atoms", level: "beginner" });
    await runJobsUntilIdle();
    const [c] = await db.select().from(courses).where(eq(courses.id, course.id));
    expect(c).toMatchObject({ format: "course", status: "outline_ready" });
  });
});

describe("format-aware prompts", () => {
  const ctx = { title: "Atoms", language: "en", level: "beginner" as const };
  const lesson = { title: "Atoms", summary: "s", position: 0 };
  it("outline asks for exactly one page for single formats", () => {
    expect(buildOutlinePrompt({ topic: "x", level: "beginner", format: "bite" }).system).toMatch(/exactly one/i);
    expect(buildOutlinePrompt({ topic: "x", level: "beginner" }).system).toMatch(/5–9 lessons/);
  });
  it("plan prompts carry the format's section bounds", () => {
    expect(buildLessonPlanPrompt({ course: ctx, lesson, lessons: [lesson], previous: null, format: "bite" }).system).toMatch(/1–2 sections/);
    expect(buildLessonPlanPrompt({ course: ctx, lesson, lessons: [lesson], previous: null, format: "story" }).system).toMatch(/4–6 sections/);
  });
  it("section prompt for a map asks for a conceptMap", () => {
    const plan = { sections: [{ heading: "The map", goal: "g", keyPoints: [], interactive: "conceptMap: the field" }] };
    expect(buildSectionPrompt({ course: ctx, lesson, plan, sectionIndex: 0, lessonCount: 1, format: "map" }).prompt).toMatch(/conceptMap/);
  });
});
