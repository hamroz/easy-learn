import { json, requireUser, route } from "@/server/http";
import { ownedSection } from "@/server/services/courses";
import { retrySection } from "@/server/services/generation";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const { section } = await ownedSection(user.id, (await params).id);
  await retrySection(section.id);
  return json({ ok: true });
});
