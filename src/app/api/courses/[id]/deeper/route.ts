import { json, requireUser, route } from "@/server/http";
import { goDeeper } from "@/server/services/derived";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = await goDeeper(user.id, (await params).id);
  return json({ id, url: `/courses/${id}` });
});
