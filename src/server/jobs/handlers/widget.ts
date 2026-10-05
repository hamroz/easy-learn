import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sections } from "@/server/db/schema";
import { generateJson } from "@/server/ai";
import type { Block } from "@/content/blocks";
import { widgetCodeSchema } from "@/content/outline";
import { buildWidgetPrompt } from "@/server/ai/prompts/widget";
import { aiFor, courseCtx } from "@/server/services/aiConfig";
import { loadSection } from "./load";
import type { JobHandler } from "./types";

async function updateCustomBlock(sectionId: string, blockId: string, patch: Partial<Extract<Block, { type: "custom" }>>) {
  await db.transaction(async (tx) => {
    const [s] = await tx.select().from(sections).where(eq(sections.id, sectionId)).for("update");
    if (!s) return;
    const blocks = s.blocks.map((b) => (b.id === blockId && b.type === "custom" ? { ...b, ...patch } : b));
    await tx.update(sections).set({ blocks }).where(eq(sections.id, sectionId));
  });
}

export const widgetHandler: JobHandler = {
  async run(job) {
    const sectionId = String(job.payload.sectionId);
    const blockId = String(job.payload.blockId);
    const { section, lesson, course } = await loadSection(sectionId);
    const block = section.blocks.find((b) => b.id === blockId);
    if (!block || block.type !== "custom") return;

    const { provider, model } = await aiFor(course.userId, "lesson");
    const { html } = await generateJson(provider, widgetCodeSchema, {
      task: "widget",
      ...buildWidgetPrompt({ course: courseCtx(course), lessonTitle: lesson.title, brief: block.brief, height: block.height }),
      model,
      effort: "medium",
    });
    await updateCustomBlock(sectionId, blockId, { code: html, status: "ready" });
  },
  async onFailed(job) {
    await updateCustomBlock(String(job.payload.sectionId), String(job.payload.blockId), { status: "failed" });
  },
};
