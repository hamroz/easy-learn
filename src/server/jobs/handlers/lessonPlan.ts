import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { lessons, sections } from "@/server/db/schema";
import { lessonPlanSchema } from "@/content/outline";
import { buildLessonPlanPrompt } from "@/server/ai/prompts/lessonPlan";
import { aiFor } from "@/server/ai/routing";
import { courseCtx } from "@/server/services/aiConfig";
import { enqueue } from "../queue";
import { loadLesson } from "./load";
import type { JobHandler } from "./types";

export const lessonPlanHandler: JobHandler = {
  async run(job) {
    const { lesson, course, all } = await loadLesson(String(job.payload.lessonId));
    const priority = Number(job.payload.priority ?? 10);
    await db.update(lessons).set({ status: "generating", error: null }).where(eq(lessons.id, lesson.id));

    const prev = all.find((l) => l.position === lesson.position - 1);
    const previous = prev?.plan ? prev.plan.sections.map((s) => `- ${s.heading}: ${s.goal}`).join("\n") : prev ? `- ${prev.title}: ${prev.summary}` : null;

    const ai = await aiFor(course.userId, "plan");
    const plan = await ai.json(lessonPlanSchema, {
      task: "lesson_plan",
      ...buildLessonPlanPrompt({
        course: courseCtx(course),
        lesson: { title: lesson.title, summary: lesson.summary, position: lesson.position },
        lessons: all.map((l) => ({ title: l.title, summary: l.summary, position: l.position })),
        previous,
      }),
    });

    const created = await db.transaction(async (tx) => {
      await tx.delete(sections).where(eq(sections.lessonId, lesson.id));
      await tx.update(lessons).set({ plan }).where(eq(lessons.id, lesson.id));
      return tx
        .insert(sections)
        .values(plan.sections.map((s, position) => ({ lessonId: lesson.id, position, heading: s.heading, goal: s.goal })))
        .returning({ id: sections.id, position: sections.position });
    });
    for (const s of created) await enqueue("section", { sectionId: s.id, priority }, { priority: priority + s.position });
  },
  async onFailed(job, message) {
    await db.update(lessons).set({ status: "failed", error: message }).where(eq(lessons.id, String(job.payload.lessonId)));
  },
};
