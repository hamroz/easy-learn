import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { courses } from "@/server/db/schema";
import { coverSchema } from "@/content/outline";
import { DEFAULT_THEME } from "@/content/theme";
import { buildCoverPrompt } from "@/server/ai/prompts/cover";
import { sanitizeSvg } from "@/server/content/sanitize";
import { aiFor } from "@/server/ai/routing";
import { loadCourse } from "./load";
import type { JobHandler } from "./types";

/** Optional decoration: failure simply leaves the course without a cover. */
export const coverHandler: JobHandler = {
  async run(job) {
    const course = await loadCourse(String(job.payload.courseId));
    const ai = await aiFor(course.userId, "cover");
    const { svg } = await ai.json(coverSchema, {
      task: "cover",
      ...buildCoverPrompt({ title: course.title, subtitle: course.subtitle, theme: course.theme ?? DEFAULT_THEME }),
    });
    const clean = sanitizeSvg(svg);
    if (clean) await db.update(courses).set({ coverSvg: clean }).where(eq(courses.id, course.id));
  },
};
