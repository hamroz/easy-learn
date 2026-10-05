import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { courses, lessons, sections } from "@/server/db/schema";
import { parseBlocksLenient } from "@/content/blocks";
import { lessonPlanSchema } from "@/content/outline";
import { DEFAULT_THEME, normalizeTheme, themeSchema } from "@/content/theme";
import { sanitizeBlocks, sanitizeSvg } from "@/server/content/sanitize";

/** Example courses shipped in the repository (examples/*.json), produced by scripts/export-course.ts. */
export const exampleFileSchema = z.object({
  version: z.literal(1),
  course: z.object({
    title: z.string().min(1),
    subtitle: z.string().nullish(),
    topicPrompt: z.string().min(1),
    language: z.string().min(2),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    theme: themeSchema.default(DEFAULT_THEME),
    coverSvg: z.string().nullish(),
  }),
  lessons: z
    .array(
      z.object({
        title: z.string().min(1),
        summary: z.string(),
        plan: lessonPlanSchema.nullish(),
        sections: z.array(z.object({ heading: z.string().min(1), goal: z.string(), blocks: z.array(z.unknown()) })).default([]),
      }),
    )
    .min(1),
});
export type ExampleFile = z.infer<typeof exampleFileSchema>;

export const defaultExamplesDir = () => process.env.EXAMPLES_DIR ?? path.join(process.cwd(), "examples");

/** Import every example the user does not have yet. Returns how many courses were added. */
export async function importExamples(userId: string, dir = defaultExamplesDir()): Promise<number> {
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return 0;
  }
  let added = 0;
  for (const file of files) {
    const parsed = exampleFileSchema.safeParse(JSON.parse(await readFile(path.join(dir, file), "utf8")));
    if (!parsed.success) {
      console.warn(`[examples] skipping ${file}: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    const ex = parsed.data;
    const [exists] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.userId, userId), eq(courses.isExample, true), eq(courses.title, ex.course.title)));
    if (exists) continue;

    await db.transaction(async (tx) => {
      const [course] = await tx
        .insert(courses)
        .values({
          userId,
          title: ex.course.title,
          subtitle: ex.course.subtitle ?? null,
          topicPrompt: ex.course.topicPrompt,
          language: ex.course.language,
          level: ex.course.level,
          theme: normalizeTheme(ex.course.theme),
          coverSvg: ex.course.coverSvg ? sanitizeSvg(ex.course.coverSvg) || null : null,
          status: "active",
          isExample: true,
        })
        .returning({ id: courses.id });
      for (const [position, l] of ex.lessons.entries()) {
        const written = l.sections.length > 0 && !!l.plan;
        const [lesson] = await tx
          .insert(lessons)
          .values({ courseId: course.id, position, title: l.title, summary: l.summary, plan: l.plan ?? null, status: written ? "ready" : "planned" })
          .returning({ id: lessons.id });
        if (written)
          await tx.insert(sections).values(
            l.sections.map((s, i) => ({
              lessonId: lesson.id,
              position: i,
              heading: s.heading,
              goal: s.goal,
              status: "ready" as const,
              blocks: sanitizeBlocks(parseBlocksLenient(s.blocks)),
            })),
          );
      }
    });
    added++;
  }
  return added;
}
