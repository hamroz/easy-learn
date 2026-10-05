import { json, requireUser, route } from "@/server/http";
import { lessonView } from "@/server/services/courses";

export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  return json(await lessonView(user.id, (await params).id));
});
