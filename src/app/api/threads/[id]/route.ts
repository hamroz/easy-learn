import { json, requireUser, route } from "@/server/http";
import { deleteThread } from "@/server/services/interactive";

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  await deleteThread(user.id, (await params).id);
  return json({ ok: true });
});
