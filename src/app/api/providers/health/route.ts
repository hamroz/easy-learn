import { getProvider, PROVIDER_IDS, type ProviderId } from "@/server/ai";
import { json, requireUser, route } from "@/server/http";

export const GET = route(async (req) => {
  await requireUser(req);
  const results = await Promise.all(
    PROVIDER_IDS.map(async (id: ProviderId) => ({ id, ...(await getProvider(id).health()) })),
  );
  return json({ providers: results });
});
