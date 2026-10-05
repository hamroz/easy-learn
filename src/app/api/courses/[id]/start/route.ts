import { json, requireUser, route, HttpError } from "@/server/http";
import { ownedCourse } from "@/server/services/courses";
import { startCourse } from "@/server/services/generation";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const course = await ownedCourse(user.id, (await params).id);
  if (course.status !== "outline_ready" && course.status !== "active") throw new HttpError(409, "The outline is not ready yet");
  if (course.busy) throw new HttpError(409, "The outline is being rewritten — try again in a moment");
  await startCourse(course.id);
  return json({ ok: true });
});
