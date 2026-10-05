import { VISIBLE_PROVIDERS } from "@/content/ai";
import { providerFor } from "@/server/ai/routing";
import { json, requireUser, route } from "@/server/http";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const providers = await Promise.all(
    VISIBLE_PROVIDERS.map(async (id) => ({ id, ...(await (await providerFor(id, user.id)).health()) })),
  );
  return json({ providers });
});
