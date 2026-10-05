import { json, requireUser, route } from "@/server/http";
import { cheatSheetFor } from "@/server/services/derived";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = await cheatSheetFor(user.id, (await params).id);
  return json({ id, url: `/courses/${id}` });
});
