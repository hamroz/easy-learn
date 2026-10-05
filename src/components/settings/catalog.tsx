"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ProviderKey } from "@/content/ai";

export type ModelInfo = { id: string; name: string; efforts: string[]; defaultEffort?: string | null; note?: string };
type Entry = { status: "loading" | "ready" | "error"; models: ModelInfo[]; error?: string };

const Ctx = createContext<{ catalog: Partial<Record<ProviderKey, Entry>>; load: (p: ProviderKey, refresh?: boolean) => void } | null>(null);

/** Model catalogues per provider, fetched once per page and shared by every picker. */
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<Partial<Record<ProviderKey, Entry>>>({});
  const started = useRef(new Set<string>());

  const load = useCallback((p: ProviderKey, refresh = false) => {
    if (started.current.has(p) && !refresh) return;
    started.current.add(p);
    setCatalog((c) => ({ ...c, [p]: { status: "loading", models: c[p]?.models ?? [] } }));
    fetch(`/api/providers/${p}/models${refresh ? "?refresh=1" : ""}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { models?: ModelInfo[]; error?: string }) =>
        setCatalog((c) => ({ ...c, [p]: { status: d.error ? "error" : "ready", models: d.models ?? [], error: d.error } })),
      )
      .catch((e) => setCatalog((c) => ({ ...c, [p]: { status: "error", models: [], error: String(e) } })));
  }, []);

  return <Ctx.Provider value={{ catalog, load }}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCatalog outside CatalogProvider");
  return ctx;
}
