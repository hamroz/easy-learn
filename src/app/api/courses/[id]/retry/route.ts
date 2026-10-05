import { json, requireUser, route } from "@/server/http";
import { ownedCourse } from "@/server/services/courses";
import { retryOutline } from "@/server/services/generation";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const course = await ownedCourse(user.id, (await params).id);
  await retryOutline(course.id);
  return json({ ok: true });
});
