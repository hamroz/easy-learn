import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { lessons } from "@/server/db/schema";
import { json, readBody, requireUser, route } from "@/server/http";
import { ownedLesson } from "@/server/services/courses";

const body = z.object({ progress: z.number().min(0).max(1), completed: z.boolean().optional() });

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const { lesson } = await ownedLesson(user.id, (await params).id);
  const { progress, completed } = await readBody(req, body);
  await db
    .update(lessons)
    .set({
      progress: sql`greatest(${lessons.progress}, ${progress})`,
      ...(completed && !lesson.completedAt ? { completedAt: new Date() } : {}),
    })
    .where(eq(lessons.id, lesson.id));
  return json({ ok: true });
});
