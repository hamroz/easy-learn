import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { type Course, settings } from "@/server/db/schema";
import { defaultProviderId, getProvider } from "@/server/ai";
import type { CourseCtx } from "@/server/ai/prompts/style";

/** Provider + model for a user's generation ("lesson") or interactive ("chat") work. */
export async function aiFor(userId: string, purpose: "lesson" | "chat") {
  const [row] = await db.select().from(settings).where(eq(settings.userId, userId));
  const providerId = row?.provider ?? defaultProviderId();
  const model = (purpose === "lesson" ? row?.lessonModel : row?.chatModel) || null;
  return { provider: getProvider(providerId), model };
}

export function courseCtx(c: Pick<Course, "title" | "subtitle" | "language" | "level">): CourseCtx {
  return { title: c.title, subtitle: c.subtitle, language: c.language, level: c.level };
}
