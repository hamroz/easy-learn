import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { courses, lessons } from "@/server/db/schema";
import { outlineSchemaFor } from "@/content/outline";
import { isSinglePage } from "@/content/formats";
import { ensureLessonGenerating } from "@/server/services/generation";
import { normalizeTheme } from "@/content/theme";
import { buildOutlinePrompt } from "@/server/ai/prompts/outline";
import { aiFor } from "@/server/ai/routing";
import { getEnabledFonts } from "@/server/services/settings";
import { resolveFont } from "@/content/fonts";
import { enqueue } from "../queue";
import { loadCourse } from "./load";
import type { JobHandler } from "./types";

export const outlineHandler: JobHandler = {
  async run(job) {
    const course = await loadCourse(String(job.payload.courseId));
    const ai = await aiFor(course.userId, "course");
    const language = course.language === "auto" ? null : course.language;
    const fonts = await getEnabledFonts(course.userId);
    const single = isSinglePage(course.format);
    const outline = await ai.json(outlineSchemaFor(single), {
      task: "outline",
      ...buildOutlinePrompt({ topic: course.topicPrompt, level: course.level, language, fonts, format: course.format }),
      meta: { topic: course.topicPrompt, format: course.format },
    });

    await db.transaction(async (tx) => {
      await tx.delete(lessons).where(eq(lessons.courseId, course.id));
      await tx.insert(lessons).values(
        outline.lessons.map((l, position) => ({ courseId: course.id, position, title: l.title, summary: l.summary })),
      );
      await tx
        .update(courses)
        .set({
          title: outline.title,
          subtitle: outline.subtitle ?? null,
          language: outline.language,
          theme: { ...normalizeTheme(outline.theme), fontPair: resolveFont(outline.theme.fontPair, fonts) },
          // Single-page formats skip outline review and start writing straight away.
          status: single ? "active" : "outline_ready",
          error: null,
        })
        .where(eq(courses.id, course.id));
    });
    await enqueue("cover", { courseId: course.id }, { priority: 200 });
    if (single) {
      const [only] = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, course.id));
      if (only) await ensureLessonGenerating(only.id);
    }
  },
  async onFailed(job, message) {
    await db.update(courses).set({ status: "failed", error: message }).where(eq(courses.id, String(job.payload.courseId)));
  },
};
