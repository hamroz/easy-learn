import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { courses, lessons, sections } from "@/server/db/schema";

export async function loadCourse(courseId: string) {
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) throw new Error(`Course ${courseId} no longer exists`);
  return course;
}

export async function loadLesson(lessonId: string) {
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  if (!lesson) throw new Error(`Lesson ${lessonId} no longer exists`);
  const course = await loadCourse(lesson.courseId);
  const all = await db.select().from(lessons).where(eq(lessons.courseId, course.id)).orderBy(asc(lessons.position));
  return { lesson, course, all };
}

export async function loadSection(sectionId: string) {
  const [section] = await db.select().from(sections).where(eq(sections.id, sectionId));
  if (!section) throw new Error(`Section ${sectionId} no longer exists`);
  return { section, ...(await loadLesson(section.lessonId)) };
}

/** A lesson is ready once no section is still pending or generating. */
export async function refreshLessonStatus(lessonId: string) {
  const secs = await db.select({ status: sections.status }).from(sections).where(eq(sections.lessonId, lessonId));
  if (secs.length && secs.every((s) => s.status === "ready" || s.status === "failed")) {
    await db.update(lessons).set({ status: "ready", error: null }).where(eq(lessons.id, lessonId));
  }
}
