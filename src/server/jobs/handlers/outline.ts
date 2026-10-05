import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { courses, lessons } from "@/server/db/schema";
import { outlineSchema } from "@/content/outline";
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
    const outline = await ai.json(outlineSchema, {
      task: "outline",
      ...buildOutlinePrompt({ topic: course.topicPrompt, level: course.level, language, fonts }),
      meta: { topic: course.topicPrompt },
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
          status: "outline_ready",
          error: null,
        })
        .where(eq(courses.id, course.id));
    });
    await enqueue("cover", { courseId: course.id }, { priority: 200 });
  },
  async onFailed(job, message) {
    await db.update(courses).set({ status: "failed", error: message }).where(eq(courses.id, String(job.payload.courseId)));
  },
};
