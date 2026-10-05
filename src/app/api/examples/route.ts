import { json, requireUser, route } from "@/server/http";
import { importExamples } from "@/server/services/examples";

export const POST = route(async (req) => {
  const user = await requireUser(req);
  return json({ added: await importExamples(user.id) });
});
