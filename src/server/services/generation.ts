import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { courses, type Level, lessons, sections, settings } from "@/server/db/schema";
import { enqueue } from "@/server/jobs/queue";

/** Priorities: lower runs first. */
const PRIORITY = { outline: 5, rewrite: 5, current: 10, prefetch: 50 } as const;

export async function createCourse(userId: string, input: { topic: string; level: Level }) {
  const [pref] = await db.select({ language: settings.language }).from(settings).where(eq(settings.userId, userId));
  const topic = input.topic.trim();
  const [course] = await db
    .insert(courses)
    .values({ userId, title: topic.slice(0, 120), topicPrompt: topic, language: pref?.language || "auto", level: input.level })
    .returning();
  await enqueue("outline", { courseId: course.id }, { priority: PRIORITY.outline });
  return course;
}

export async function retryOutline(courseId: string) {
  const [row] = await db
    .update(courses)
    .set({ status: "outlining", error: null })
    .where(and(eq(courses.id, courseId), eq(courses.status, "failed")))
    .returning();
  if (row) await enqueue("outline", { courseId }, { priority: PRIORITY.outline });
}

/** Queue a lesson's plan if it has not been started (or failed). Idempotent. */
export async function ensureLessonGenerating(lessonId: string, priority: number = PRIORITY.current) {
  const [row] = await db
    .update(lessons)
    .set({ status: "queued", error: null })
    .where(and(eq(lessons.id, lessonId), inArray(lessons.status, ["planned", "failed"])))
    .returning({ id: lessons.id });
  if (row) await enqueue("lesson_plan", { lessonId, priority }, { priority });
}

/** Called when the reader opens a lesson: make sure it exists and prefetch the next one. */
export async function openLesson(lessonId: string) {
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  if (!lesson) return;
  await ensureLessonGenerating(lesson.id, PRIORITY.current);
  const [next] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(eq(lessons.courseId, lesson.courseId), eq(lessons.position, lesson.position + 1)));
  if (next) await ensureLessonGenerating(next.id, PRIORITY.prefetch);
}

export async function startCourse(courseId: string) {
  await db.update(courses).set({ status: "active" }).where(eq(courses.id, courseId));
  const [first] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(eq(lessons.courseId, courseId), eq(lessons.position, 0)));
  if (first) await openLesson(first.id);
}

async function rewrite(courseId: string, busy: "reshaping" | "steering", payload: Record<string, unknown>) {
  const [row] = await db
    .update(courses)
    .set({ busy, error: null })
    .where(and(eq(courses.id, courseId), isNull(courses.busy)))
    .returning({ id: courses.id });
  if (!row) return false;
  await enqueue(busy === "reshaping" ? "reshape" : "steer", { courseId, ...payload }, { priority: PRIORITY.rewrite });
  return true;
}

export function reshapeOutline(courseId: string, instruction: string) {
  return rewrite(courseId, "reshaping", { instruction });
}

export function steerCourse(courseId: string, afterPosition: number, instruction: string) {
  return rewrite(courseId, "steering", { instruction, afterPosition });
}

export async function retrySection(sectionId: string) {
  const [row] = await db
    .update(sections)
    .set({ status: "pending", error: null })
    .where(and(eq(sections.id, sectionId), eq(sections.status, "failed")))
    .returning();
  if (!row) return;
  await db.update(lessons).set({ status: "generating" }).where(eq(lessons.id, row.lessonId));
  await enqueue("section", { sectionId, priority: PRIORITY.current }, { priority: PRIORITY.current });
}
