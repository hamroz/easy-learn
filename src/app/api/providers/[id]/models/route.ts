import { PROVIDERS, type ProviderKey } from "@/content/ai";
import { listModelsCached } from "@/server/ai/catalog";
import { HttpError, json, requireUser, route } from "@/server/http";

export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id } = await params;
  if (!(PROVIDERS as readonly string[]).includes(id)) throw new HttpError(404, "Unknown provider");
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    return json({ models: await listModelsCached(id as ProviderKey, user.id, refresh) });
  } catch (e) {
    return json({ models: [], error: (e as Error).message });
  }
});
