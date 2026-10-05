import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sections } from "@/server/db/schema";
import { generateJson } from "@/server/ai";
import { parseBlocksLenient, sectionBlocksSchema } from "@/content/blocks";
import { buildSectionPrompt } from "@/server/ai/prompts/section";
import { sanitizeBlocks } from "@/server/content/sanitize";
import { aiFor, courseCtx } from "@/server/services/aiConfig";
import { enqueue } from "../queue";
import { loadSection, refreshLessonStatus } from "./load";
import type { JobHandler } from "./types";

export const sectionHandler: JobHandler = {
  async run(job) {
    const { section, lesson, course, all } = await loadSection(String(job.payload.sectionId));
    if (!lesson.plan) throw new Error("Lesson has no plan yet");
    const priority = Number(job.payload.priority ?? 10);
    await db.update(sections).set({ status: "generating", error: null }).where(eq(sections.id, section.id));

    const { provider, model } = await aiFor(course.userId, "lesson");
    const out = await generateJson(
      provider,
      sectionBlocksSchema,
      {
        task: "section",
        ...buildSectionPrompt({
          course: courseCtx(course),
          lesson: { title: lesson.title, summary: lesson.summary, position: lesson.position },
          plan: lesson.plan,
          sectionIndex: section.position,
          lessonCount: all.length,
        }),
        model,
        effort: "medium",
        meta: { position: section.position },
      },
      {
        lenient: (raw) => {
          const blocks = parseBlocksLenient((raw as { blocks?: unknown })?.blocks);
          return blocks.length ? { blocks } : null;
        },
      },
    );

    const blocks = sanitizeBlocks(parseBlocksLenient(out.blocks));
    await db.update(sections).set({ blocks, status: "ready", error: null }).where(eq(sections.id, section.id));
    for (const b of blocks) {
      if (b.type === "custom" && b.status === "pending")
        await enqueue("widget", { sectionId: section.id, blockId: b.id }, { priority: priority + 20 });
    }
    await refreshLessonStatus(lesson.id);
  },
  async onFailed(job, message) {
    const sectionId = String(job.payload.sectionId);
    const [row] = await db.update(sections).set({ status: "failed", error: message }).where(eq(sections.id, sectionId)).returning();
    if (row) await refreshLessonStatus(row.lessonId);
  },
};
