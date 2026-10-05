"use client";

import { useEffect, useMemo, useState } from "react";
import { type AiSettings, PROVIDER_LABELS, type ProviderKey } from "@/content/ai";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { Dots } from "@/components/ui/Spinner";
import { useCatalog } from "./catalog";
import { libraryFor } from "./ModelPicker";

const TABS: ProviderKey[] = ["codex-cli", "opencode-cli", "openrouter"];

/** Choose which models appear in the pickers at all. */
export function LibrarySection({ ai, onChange }: { ai: AiSettings; onChange: (ai: AiSettings) => void }) {
  const [tab, setTab] = useState<ProviderKey>("opencode-cli");
  const [query, setQuery] = useState("");
  const [onlyEnabled, setOnlyEnabled] = useState(false);
  const { catalog, load } = useCatalog();
  useEffect(() => load(tab), [tab, load]);

  const entry = catalog[tab];
  const models = useMemo(() => entry?.models ?? [], [entry]);
  const enabled = new Set(libraryFor(ai, tab, models.map((m) => m.id)));
  const q = query.trim().toLowerCase();
  const shown = models.filter((m) => (!q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) && (!onlyEnabled || enabled.has(m.id)));

  const set = (ids: Iterable<string>) => onChange({ ...ai, library: { ...ai.library, [tab]: [...new Set(ids)] } });
  const toggle = (id: string) => {
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set(next);
  };

  return (
    <div className="font-ui">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="flex rounded-full bg-border/40 p-1 text-[13px]">
          {TABS.map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={tab === p}
              onClick={() => setTab(p)}
              className={`rounded-full px-3 py-1.5 transition ${tab === p ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}
            >
              {PROVIDER_LABELS[p]}
              <span className="ml-1.5 tabular-nums text-muted">{libraryFor(ai, p, catalog[p]?.models.map((m) => m.id) ?? []).length || ""}</span>
            </button>
          ))}
        </div>
        <button onClick={() => load(tab, true)} className="ml-auto text-[13px] text-muted hover:text-text">
          Refresh list
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${models.length || ""} models…`} className={`${inputClass} max-w-sm`} />
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={onlyEnabled} onChange={(e) => setOnlyEnabled(e.target.checked)} /> Enabled only
        </label>
        <span className="text-[13px] text-muted">{enabled.size} enabled</span>
        {shown.length > 0 && shown.length <= 60 && (
          <Button size="sm" variant="ghost" onClick={() => set([...enabled, ...shown.map((m) => m.id)])}>
            Enable all shown
          </Button>
        )}
        {enabled.size > 0 && (
          <Button size="sm" variant="ghost" onClick={() => set([])}>
            Clear
          </Button>
        )}
      </div>

      <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-border">
        {entry?.status === "loading" && models.length === 0 && (
          <p className="flex items-center gap-2 px-4 py-6 text-[14px] text-muted">
            Loading models <Dots />
          </p>
        )}
        {entry?.status === "error" && <p className="px-4 py-4 text-[13px] text-[#b42318] dark:text-[#ff8a80]">{entry.error}</p>}
        {entry?.status === "ready" && shown.length === 0 && <p className="px-4 py-6 text-[14px] text-muted">No models match.</p>}
        {shown.slice(0, 300).map((m) => (
          <label key={m.id} className="flex cursor-pointer items-start gap-3 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-border/20">
            <input type="checkbox" className="mt-1" checked={enabled.has(m.id)} onChange={() => toggle(m.id)} />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] text-text">{m.name}</span>
              <span className="block truncate font-mono text-[11.5px] text-muted">{m.id}</span>
            </span>
            <span className="shrink-0 text-right text-[11.5px] text-muted">
              {m.note && <span className="block">{m.note}</span>}
              {m.efforts.length > 0 && <span className="block">effort: {m.efforts.join(" · ")}</span>}
            </span>
          </label>
        ))}
        {shown.length > 300 && <p className="px-4 py-3 text-[12.5px] text-muted">Showing 300 of {shown.length} — search to narrow down.</p>}
      </div>
    </div>
  );
}
