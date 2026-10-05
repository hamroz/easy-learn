import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { courses, lessons } from "@/server/db/schema";
import { generateJson } from "@/server/ai";
import { lessonsListSchema } from "@/content/outline";
import { buildReshapePrompt } from "@/server/ai/prompts/reshape";
import { aiFor, courseCtx } from "@/server/services/aiConfig";
import { loadCourse } from "./load";
import type { JobHandler } from "./types";

/**
 * Reshape (before starting) and steer (after a lesson) both rewrite the not-yet-generated tail of the outline.
 * Lessons that already have content, or sit at or before `afterPosition`, are never touched.
 */
function rewriteHandler(mode: "reshape" | "steer"): JobHandler {
  return {
    async run(job) {
      const course = await loadCourse(String(job.payload.courseId));
      const afterPosition = typeof job.payload.afterPosition === "number" ? job.payload.afterPosition : -1;
      const all = await db.select().from(lessons).where(eq(lessons.courseId, course.id)).orderBy(asc(lessons.position));
      const fixed = all.filter((l) => l.position <= afterPosition || l.status !== "planned");
      const planned = all.filter((l) => !fixed.includes(l));

      const { provider, model } = await aiFor(course.userId, "lesson");
      const out = await generateJson(provider, lessonsListSchema, {
        task: mode,
        ...buildReshapePrompt({
          course: courseCtx(course),
          fixed: fixed.map((l) => ({ title: l.title, summary: l.summary })),
          planned: planned.map((l) => ({ title: l.title, summary: l.summary })),
          instruction: String(job.payload.instruction ?? ""),
          mode,
        }),
        model,
        effort: "medium",
      });

      await db.transaction(async (tx) => {
        // The AI call took minutes: re-read under lock and only replace lessons that are still untouched,
        // so a lesson the reader opened meanwhile (now queued/generating) is never deleted.
        const now = await tx.select().from(lessons).where(eq(lessons.courseId, course.id)).orderBy(asc(lessons.position)).for("update");
        const replaceable = new Set(planned.map((l) => l.id));
        const doomed = now.filter((l) => replaceable.has(l.id) && l.status === "planned" && l.position > afterPosition);
        const kept = now.filter((l) => !doomed.includes(l));
        if (doomed.length) await tx.delete(lessons).where(inArray(lessons.id, doomed.map((l) => l.id)));
        // Re-number kept lessons densely (two passes avoid transient duplicates), then append the new tail.
        for (const [i, l] of kept.entries()) await tx.update(lessons).set({ position: 10_000 + i }).where(eq(lessons.id, l.id));
        for (const [i, l] of kept.entries()) await tx.update(lessons).set({ position: i }).where(eq(lessons.id, l.id));
        await tx.insert(lessons).values(
          out.lessons.map((l, i) => ({ courseId: course.id, position: kept.length + i, title: l.title, summary: l.summary })),
        );
        await tx.update(courses).set({ busy: null, error: null }).where(eq(courses.id, course.id));
      });
    },
    async onFailed(job, message) {
      await db
        .update(courses)
        .set({ busy: null, error: `Could not update the outline: ${message}` })
        .where(and(eq(courses.id, String(job.payload.courseId))));
    },
  };
}

export const reshapeHandler = rewriteHandler("reshape");
export const steerHandler = rewriteHandler("steer");
