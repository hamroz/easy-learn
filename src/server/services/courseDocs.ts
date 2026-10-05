import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { courses, lessons, sections } from "@/server/db/schema";
import { type Block, blockSchema, parseBlocksLenient } from "@/content/blocks";
import { resolveFont } from "@/content/fonts";
import { type LessonPlan, lessonPlanSchema } from "@/content/outline";
import { DEFAULT_THEME, normalizeTheme, themeSchema } from "@/content/theme";
import { plotIssues } from "@/server/content/quality";
import { sanitizeBlocks, sanitizeSvg } from "@/server/content/sanitize";
import { enqueue } from "@/server/jobs/queue";
import { FORMAT_IDS, isSinglePage } from "@/content/formats";
import { ensureLessonGenerating } from "./generation";
import { getEnabledFonts } from "./settings";

/** A whole course as a document: the format of examples/*.json and of the authoring API. */
export const courseDocSchema = z.object({
  version: z.literal(1),
  /** Course (default) or a single-page format; single-page documents have exactly one lesson. */
  format: z.enum(FORMAT_IDS).default("course"),
  course: z.object({
    title: z.string().min(1).max(160),
    subtitle: z.string().max(300).nullish(),
    topicPrompt: z.string().min(1).max(2000),
    language: z.string().min(2).max(20),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    theme: themeSchema.default(DEFAULT_THEME),
    coverSvg: z.string().nullish(),
  }),
  lessons: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        summary: z.string().max(600),
        plan: lessonPlanSchema.nullish(),
        sections: z.array(z.object({ heading: z.string().min(1).max(160), goal: z.string().default(""), blocks: z.array(z.unknown()) })).default([]),
      }),
    )
    .min(1)
    .max(20),
});
export type CourseDoc = z.infer<typeof courseDocSchema>;

/** Strict validation for authored courses: every block must be valid and every plot must teach something. */
export function validateCourseDocument(raw: unknown): { ok: true; doc: CourseDoc } | { ok: false; issues: string[] } {
  const parsed = courseDocSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, issues: parsed.error.issues.slice(0, 30).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const issues: string[] = [];
  if (isSinglePage(parsed.data.format) && parsed.data.lessons.length !== 1)
    issues.push(`lessons: a ${parsed.data.format} must have exactly one lesson (it is a single page)`);
  parsed.data.lessons.forEach((l, li) =>
    l.sections.forEach((s, si) => {
      if (!s.blocks.length) issues.push(`lessons.${li}.sections.${si}: has no blocks`);
      s.blocks.forEach((b, bi) => {
        const where = `lessons.${li}.sections.${si}.blocks.${bi}`;
        const r = blockSchema.safeParse(b);
        if (!r.success) return issues.push(...r.error.issues.slice(0, 3).map((i) => `${where}.${i.path.join(".")}: ${i.message}`));
        if (r.data.type === "plot") plotIssues(r.data).forEach((m) => issues.push(`${where} (plot): ${m}`));
      });
    }),
  );
  return issues.length ? { ok: false, issues: issues.slice(0, 40) } : { ok: true, doc: parsed.data };
}

const planFromSections = (secs: { heading: string; goal: string }[]): LessonPlan => ({
  sections: secs.map((s) => ({ heading: s.heading, goal: s.goal || s.heading, keyPoints: [] })),
});

/** Insert a course document for a user. Lessons with sections are ready; the rest are written on demand. */
export async function importCourseDocument(userId: string, doc: CourseDoc, opts: { isExample?: boolean } = {}): Promise<string> {
  const fonts = await getEnabledFonts(userId);
  const theme = normalizeTheme(doc.course.theme);
  const written = (l: CourseDoc["lessons"][number]) => l.sections.length > 0;
  const cover = doc.course.coverSvg ? sanitizeSvg(doc.course.coverSvg) || null : null;

  const courseId = await db.transaction(async (tx) => {
    const [course] = await tx
      .insert(courses)
      .values({
        userId,
        title: doc.course.title,
        subtitle: doc.course.subtitle ?? null,
        topicPrompt: doc.course.topicPrompt,
        language: doc.course.language,
        level: doc.course.level,
        theme: opts.isExample ? theme : { ...theme, fontPair: resolveFont(theme.fontPair, fonts) },
        coverSvg: cover,
        status: doc.lessons.some(written) || isSinglePage(doc.format) ? "active" : "outline_ready",
        format: doc.format,
        isExample: !!opts.isExample,
      })
      .returning({ id: courses.id });
    for (const [position, l] of doc.lessons.entries()) {
      const [lesson] = await tx
        .insert(lessons)
        .values({
          courseId: course.id,
          position,
          title: l.title,
          summary: l.summary,
          plan: written(l) ? (l.plan ?? planFromSections(l.sections)) : null,
          status: written(l) ? "ready" : "planned",
        })
        .returning({ id: lessons.id });
      if (written(l))
        await tx.insert(sections).values(
          l.sections.map((s, i) => ({
            lessonId: lesson.id,
            position: i,
            heading: s.heading,
            goal: s.goal,
            status: "ready" as const,
            blocks: sanitizeBlocks(parseBlocksLenient(s.blocks) as Block[]),
          })),
        );
    }
    return course.id;
  });
  if (!cover && !opts.isExample) await enqueue("cover", { courseId }, { priority: 200 });
  // An outline-only single page has nothing to review: start writing it.
  if (isSinglePage(doc.format) && !doc.lessons.some(written) && !opts.isExample) {
    const [only] = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, courseId));
    if (only) await ensureLessonGenerating(only.id);
  }
  return courseId;
}
