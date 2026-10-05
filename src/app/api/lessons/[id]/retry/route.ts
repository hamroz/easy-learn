import { json, requireUser, route } from "@/server/http";
import { ownedLesson } from "@/server/services/courses";
import { ensureLessonGenerating } from "@/server/services/generation";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const { lesson } = await ownedLesson(user.id, (await params).id);
  await ensureLessonGenerating(lesson.id);
  return json({ ok: true });
});
