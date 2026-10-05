import type { Course } from "@/server/db/schema";
import type { CourseCtx } from "@/server/ai/prompts/style";

export function courseCtx(c: Pick<Course, "title" | "subtitle" | "language" | "level">): CourseCtx {
  return { title: c.title, subtitle: c.subtitle, language: c.language, level: c.level };
}
