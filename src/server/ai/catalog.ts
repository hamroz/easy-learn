import type { ProviderKey } from "@/content/ai";
import { providerFor } from "./routing";
import type { ModelInfo } from "./types";

const TTL_MS = 60 * 60_000;
const g = globalThis as unknown as { __elCatalog?: Map<string, { at: number; models: ModelInfo[] }> };
const cache = (g.__elCatalog ??= new Map());

/** A provider's model list, cached for an hour (CLI catalogue calls take a few seconds). */
export async function listModelsCached(provider: ProviderKey, userId: string, refresh = false): Promise<ModelInfo[]> {
  const hit = cache.get(provider);
  if (!refresh && hit && Date.now() - hit.at < TTL_MS) return hit.models;
  const p = await providerFor(provider, userId);
  const models = (await p.listModels?.()) ?? [];
  cache.set(provider, { at: Date.now(), models });
  return models;
}
