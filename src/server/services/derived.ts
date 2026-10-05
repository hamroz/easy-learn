import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { courses, lessons, sections } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import { ownedCourse, ownedLesson } from "./courses";
import { createCourse } from "./generation";

async function childWithTopic(userId: string, parentId: string, format: "bite" | "cheatsheet" | "course", topicPrompt?: string) {
  const conds = [eq(courses.userId, userId), eq(courses.parentId, parentId), eq(courses.format, format)];
  if (topicPrompt) conds.push(eq(courses.topicPrompt, topicPrompt));
  const [row] = await db.select({ id: courses.id }).from(courses).where(and(...conds));
  return row?.id ?? null;
}

/** Open (or reuse) a quick bite about one idea on a map. */
export async function biteForMapNode(userId: string, lessonId: string, nodeId: string): Promise<string> {
  const { lesson, course } = await ownedLesson(userId, lessonId);
  if (course.format !== "map") throw new HttpError(400, "Quick bites come from maps");
  const secs = await db.select().from(sections).where(eq(sections.lessonId, lesson.id)).orderBy(asc(sections.position));
  const node = secs
    .flatMap((s) => s.blocks)
    .flatMap((b) => (b.type === "conceptMap" ? b.nodes : []))
    .find((n) => n.id === nodeId);
  if (!node) throw new HttpError(404, "That idea is not on this map");
  const topic = `${node.label} — in the context of "${course.title}". ${node.summary}`.slice(0, 2000);
  const existing = await childWithTopic(userId, course.id, "bite", topic);
  if (existing) return existing;
  const bite = await createCourse(userId, { topic, level: course.level, format: "bite", parentId: course.id, title: node.label });
  return bite.id;
}

/** One cheat sheet per course, built from its outline. */
export async function cheatSheetFor(userId: string, courseId: string): Promise<string> {
  const course = await ownedCourse(userId, courseId);
  if (course.format !== "course") throw new HttpError(400, "Cheat sheets are made from courses");
  const existing = await childWithTopic(userId, course.id, "cheatsheet");
  if (existing) return existing;
  const ls = await db.select().from(lessons).where(eq(lessons.courseId, course.id)).orderBy(asc(lessons.position));
  const topic = `A cheat sheet for the course "${course.title}", covering: ${ls.map((l) => `${l.title} (${l.summary})`).join("; ")}`.slice(0, 2000);
  const sheet = await createCourse(userId, { topic, level: course.level, format: "cheatsheet", parentId: course.id, title: `Cheat sheet: ${course.title}` });
  return sheet.id;
}

/** Turn a short item into a full course on the same topic. */
export async function goDeeper(userId: string, courseId: string): Promise<string> {
  const item = await ownedCourse(userId, courseId);
  if (item.format === "course") throw new HttpError(400, "This is already a course");
  const existing = await childWithTopic(userId, item.id, "course");
  if (existing) return existing;
  const course = await createCourse(userId, { topic: item.topicPrompt, level: item.level, format: "course", parentId: item.id, title: item.title });
  return course.id;
}
