import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { blockVariants, courses, lessons, messages, quizzes, sections, threads } from "@/server/db/schema";
import { HttpError } from "@/server/http";

export async function ownedCourse(userId: string, courseId: string) {
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId)));
  if (!course) throw new HttpError(404, "Course not found");
  return course;
}

export async function ownedLesson(userId: string, lessonId: string) {
  const [row] = await db
    .select({ lesson: lessons, course: courses })
    .from(lessons)
    .innerJoin(courses, eq(courses.id, lessons.courseId))
    .where(and(eq(lessons.id, lessonId), eq(courses.userId, userId)));
  if (!row) throw new HttpError(404, "Lesson not found");
  return row;
}

export async function ownedSection(userId: string, sectionId: string) {
  const [row] = await db
    .select({ section: sections, lesson: lessons, course: courses })
    .from(sections)
    .innerJoin(lessons, eq(lessons.id, sections.lessonId))
    .innerJoin(courses, eq(courses.id, lessons.courseId))
    .where(and(eq(sections.id, sectionId), eq(courses.userId, userId)));
  if (!row) throw new HttpError(404, "Section not found");
  return row;
}

export async function ownedThread(userId: string, threadId: string) {
  const [thread] = await db
    .select()
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.userId, userId)));
  if (!thread) throw new HttpError(404, "Thread not found");
  return thread;
}

export async function listCourses(userId: string) {
  const rows = await db.select().from(courses).where(eq(courses.userId, userId)).orderBy(desc(courses.updatedAt));
  if (!rows.length) return [];
  const stats = await db
    .select({
      courseId: lessons.courseId,
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(${lessons.completedAt})::int`,
      lastRead: sql<Date | null>`max(${lessons.updatedAt}) filter (where ${lessons.progress} > 0)`,
    })
    .from(lessons)
    .where(inArray(lessons.courseId, rows.map((r) => r.id)))
    .groupBy(lessons.courseId);
  const firstUnfinished = await db
    .select({ courseId: lessons.courseId, id: lessons.id, position: lessons.position, title: lessons.title })
    .from(lessons)
    .where(and(inArray(lessons.courseId, rows.map((r) => r.id)), sql`${lessons.completedAt} is null`))
    .orderBy(asc(lessons.position));
  return rows.map((c) => {
    const s = stats.find((x) => x.courseId === c.id);
    const next = firstUnfinished.find((x) => x.courseId === c.id);
    return {
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      status: c.status,
      busy: c.busy,
      error: c.error,
      theme: c.theme,
      coverSvg: c.coverSvg,
      isExample: c.isExample,
      lessonCount: s?.total ?? 0,
      completedCount: s?.completed ?? 0,
      next: next ? { id: next.id, title: next.title, position: next.position } : null,
      updatedAt: c.updatedAt,
    };
  });
}

export async function courseView(userId: string, courseId: string) {
  const course = await ownedCourse(userId, courseId);
  const list = await db
    .select({
      id: lessons.id,
      position: lessons.position,
      title: lessons.title,
      summary: lessons.summary,
      status: lessons.status,
      progress: lessons.progress,
      completedAt: lessons.completedAt,
      error: lessons.error,
    })
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.position));
  return { course, lessons: list };
}

export type CourseView = Awaited<ReturnType<typeof courseView>>;

export async function lessonView(userId: string, lessonId: string) {
  const { lesson, course } = await ownedLesson(userId, lessonId);
  const [secs, nav, threadRows, quizRows] = await Promise.all([
    db.select().from(sections).where(eq(sections.lessonId, lessonId)).orderBy(asc(sections.position)),
    db
      .select({ id: lessons.id, position: lessons.position, title: lessons.title, status: lessons.status, completedAt: lessons.completedAt })
      .from(lessons)
      .where(eq(lessons.courseId, course.id))
      .orderBy(asc(lessons.position)),
    db.select().from(threads).where(and(eq(threads.lessonId, lessonId), eq(threads.userId, userId))).orderBy(asc(threads.createdAt)),
    db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).orderBy(desc(quizzes.createdAt)).limit(1),
  ]);
  const variantRows = secs.length
    ? await db.select().from(blockVariants).where(inArray(blockVariants.sectionId, secs.map((s) => s.id))).orderBy(asc(blockVariants.createdAt))
    : [];
  const messageRows = threadRows.length
    ? await db.select().from(messages).where(inArray(messages.threadId, threadRows.map((t) => t.id))).orderBy(asc(messages.createdAt))
    : [];

  return {
    course: {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      language: course.language,
      theme: course.theme,
      busy: course.busy,
      error: course.error,
    },
    lesson: {
      id: lesson.id,
      position: lesson.position,
      title: lesson.title,
      summary: lesson.summary,
      status: lesson.status,
      error: lesson.error,
      progress: lesson.progress,
      completedAt: lesson.completedAt,
    },
    sections: secs.map((s) => ({ id: s.id, position: s.position, heading: s.heading, status: s.status, blocks: s.blocks, error: s.error })),
    variants: variantRows.map((v) => ({ id: v.id, sectionId: v.sectionId, blockId: v.blockId, kind: v.kind, md: v.md })),
    threads: threadRows.map((t) => ({
      id: t.id,
      sectionId: t.sectionId,
      blockId: t.blockId,
      variantId: t.variantId,
      anchor: t.anchor,
      createdAt: t.createdAt,
      messages: messageRows.filter((m) => m.threadId === t.id).map((m) => ({ id: m.id, role: m.role, content: m.content })),
    })),
    quiz: quizRows[0] ? { id: quizRows[0].id, content: quizRows[0].content } : null,
    nav: {
      lessons: nav,
      prev: nav.find((l) => l.position === lesson.position - 1) ?? null,
      next: nav.find((l) => l.position === lesson.position + 1) ?? null,
    },
  };
}

export type LessonView = Awaited<ReturnType<typeof lessonView>>;

/** Replace the outline before the course has started. */
export async function replaceOutline(userId: string, courseId: string, items: { title: string; summary: string }[]) {
  const course = await ownedCourse(userId, courseId);
  if (course.status !== "outline_ready") throw new HttpError(409, "The outline can only be edited before you start learning");
  if (course.busy) throw new HttpError(409, "The outline is being rewritten — try again in a moment");
  await db.transaction(async (tx) => {
    await tx.delete(lessons).where(eq(lessons.courseId, courseId));
    await tx.insert(lessons).values(items.map((l, position) => ({ courseId, position, title: l.title.trim(), summary: l.summary.trim() })));
  });
}
