"use client";

import { useState } from "react";
import { type AiSettings, type ModelRef, type Preset, TASK_LABELS, TASKS } from "@/content/ai";
import { Button } from "@/components/ui/Button";
import { ModelPicker } from "./ModelPicker";

export function PresetsSection({ ai, builtins, onChange }: { ai: AiSettings; builtins: Preset[]; onChange: (ai: AiSettings) => void }) {
  const all = [...ai.presets, ...builtins];
  const [viewId, setViewId] = useState(ai.activePresetId);
  const viewing = all.find((p) => p.id === viewId) ?? all[0];
  const editable = ai.presets.some((p) => p.id === viewing.id);
  const [bulk, setBulk] = useState<ModelRef | null>(viewing.routes.writing.primary);

  const updatePreset = (next: Preset) => onChange({ ...ai, presets: ai.presets.map((p) => (p.id === next.id ? next : p)) });
  const setRoute = (task: (typeof TASKS)[number], key: "primary" | "fallback", ref: ModelRef | null) => {
    if (key === "primary" && !ref) return;
    updatePreset({ ...viewing, routes: { ...viewing.routes, [task]: { ...viewing.routes[task], [key]: ref } } });
  };

  const duplicate = () => {
    const copy: Preset = { ...structuredClone(viewing), id: `p-${Date.now().toString(36)}`, name: `${viewing.name.replace(/^.*— /, "")} (mine)` };
    onChange({ ...ai, presets: [...ai.presets, copy], activePresetId: copy.id });
    setViewId(copy.id);
  };
  const rename = () => {
    const name = prompt("Preset name", viewing.name)?.trim();
    if (name) updatePreset({ ...viewing, name: name.slice(0, 60) });
  };
  const remove = () => {
    if (!confirm(`Delete the preset "${viewing.name}"?`)) return;
    const presets = ai.presets.filter((p) => p.id !== viewing.id);
    const activePresetId = ai.activePresetId === viewing.id ? builtins[0].id : ai.activePresetId;
    onChange({ ...ai, presets, activePresetId });
    setViewId(activePresetId);
  };
  const applyAll = () => {
    if (!bulk) return;
    updatePreset({ ...viewing, routes: Object.fromEntries(TASKS.map((t) => [t, { ...viewing.routes[t], primary: { ...bulk } }])) as Preset["routes"] });
  };

  return (
    <div className="space-y-5 font-ui">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Preset"
          value={viewing.id}
          onChange={(e) => setViewId(e.target.value)}
          className="h-10 rounded-xl border border-border bg-surface px-3 text-[14px] text-text outline-none focus:border-accent"
        >
          {ai.presets.length > 0 && (
            <optgroup label="Your presets">
              {ai.presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.id === ai.activePresetId ? " (active)" : ""}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Built-in">
            {builtins.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.id === ai.activePresetId ? " (active)" : ""}
              </option>
            ))}
          </optgroup>
        </select>
        {viewing.id !== ai.activePresetId ? (
          <Button size="sm" onClick={() => onChange({ ...ai, activePresetId: viewing.id })}>
            Use this preset
          </Button>
        ) : (
          <span className="rounded-full bg-accent/12 px-3 py-1 text-[12px] text-accent">Active</span>
        )}
        <Button size="sm" variant="secondary" onClick={duplicate}>
          {editable ? "Duplicate" : "Duplicate to customise"}
        </Button>
        {editable && (
          <>
            <Button size="sm" variant="ghost" onClick={rename}>
              Rename
            </Button>
            <Button size="sm" variant="danger" onClick={remove}>
              Delete
            </Button>
          </>
        )}
      </div>

      {editable && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3">
          <span className="text-[13px] text-muted">Use one model for every task:</span>
          <div className="min-w-0 flex-1 basis-[300px]">
            <ModelPicker value={bulk} onChange={setBulk} ai={ai} />
          </div>
          <Button size="sm" variant="secondary" onClick={applyAll} disabled={!bulk}>
            Apply to all
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="hidden grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-border bg-border/25 px-4 py-2 text-[11.5px] uppercase tracking-[0.12em] text-muted lg:grid">
          <span>Task</span>
          <span>Model</span>
          <span>If it fails, try</span>
        </div>
        {TASKS.map((t) => (
          <div key={t} className="grid gap-3 border-b border-border px-4 py-3 last:border-b-0 lg:grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-4">
            <div>
              <div className="text-[14px] text-text">{TASK_LABELS[t].name}</div>
              <div className="text-[12px] text-muted">{TASK_LABELS[t].hint}</div>
            </div>
            <ModelPicker value={viewing.routes[t].primary} onChange={(v) => setRoute(t, "primary", v)} ai={ai} disabled={!editable} />
            <ModelPicker value={viewing.routes[t].fallback} onChange={(v) => setRoute(t, "fallback", v)} ai={ai} allowNone disabled={!editable} />
          </div>
        ))}
      </div>
      {!editable && <p className="text-[13px] text-muted">Built-in presets can&apos;t be edited — duplicate one to make it yours.</p>}
    </div>
  );
}
