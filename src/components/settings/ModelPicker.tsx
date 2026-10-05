"use client";

import { useEffect } from "react";
import { type AiSettings, type ModelRef, PROVIDER_LABELS, type ProviderKey, VISIBLE_PROVIDERS } from "@/content/ai";
import { useCatalog } from "./catalog";

const select =
  "h-9 min-w-0 rounded-lg border border-border bg-surface px-2 text-[13px] text-text outline-none transition focus:border-accent disabled:opacity-50";

/** Models the owner enabled for a provider. Codex lists everything until the owner narrows it down. */
export function libraryFor(ai: AiSettings, provider: ProviderKey, catalogIds: string[]): string[] {
  const lib = ai.library[provider];
  if (lib) return lib;
  return provider === "codex-cli" || provider === "mock" ? catalogIds : [];
}

export function ModelPicker({
  value,
  onChange,
  ai,
  allowNone,
  disabled,
}: {
  value: ModelRef | null;
  onChange: (v: ModelRef | null) => void;
  ai: AiSettings;
  allowNone?: boolean;
  disabled?: boolean;
}) {
  const { catalog, load } = useCatalog();
  const provider = value?.provider;
  useEffect(() => {
    if (provider) load(provider);
  }, [provider, load]);

  const entry = provider ? catalog[provider] : undefined;
  const models = entry?.models ?? [];
  const library = provider ? libraryFor(ai, provider, models.map((m) => m.id)) : [];
  const options = [...new Set([...library, ...(value?.model ? [value.model] : [])])];
  const info = models.find((m) => m.id === value?.model);
  const efforts = info ? info.efforts : provider === "codex-cli" ? ["low", "medium", "high"] : [];
  const canDefault = provider === "codex-cli" || provider === "opencode-cli";
  const providers = [...VISIBLE_PROVIDERS, ...(provider && !VISIBLE_PROVIDERS.includes(provider) ? [provider] : [])];

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <select
        aria-label="Provider"
        className={`${select} w-[108px] shrink-0`}
        disabled={disabled}
        value={provider ?? ""}
        onChange={(e) => {
          const p = e.target.value as ProviderKey | "";
          if (!p) return onChange(null);
          onChange({ provider: p, model: p === "mock" ? "mock" : null, effort: null });
        }}
      >
        {allowNone && <option value="">No fallback</option>}
        {providers.map((p) => (
          <option key={p} value={p}>
            {PROVIDER_LABELS[p]}
          </option>
        ))}
      </select>
      {value && value.provider !== "mock" && (
        <>
          <select
            aria-label="Model"
            className={`${select} min-w-[130px] flex-1 basis-[140px]`}
            disabled={disabled}
            value={value.model ?? ""}
            onChange={(e) => onChange({ ...value, model: e.target.value || null, effort: null })}
          >
            {canDefault && <option value="">Default model</option>}
            {!canDefault && !value.model && <option value="">Choose a model…</option>}
            {options.map((id) => (
              <option key={id} value={id}>
                {models.find((m) => m.id === id)?.name ?? id}
              </option>
            ))}
          </select>
          <select
            aria-label="Effort"
            className={`${select} w-[92px] shrink-0`}
            disabled={disabled || efforts.length === 0}
            value={value.effort ?? ""}
            onChange={(e) => onChange({ ...value, effort: e.target.value || null })}
          >
            <option value="">{efforts.length ? "Default effort" : "—"}</option>
            {efforts.map((ef) => (
              <option key={ef} value={ef}>
                {ef}
              </option>
            ))}
          </select>
        </>
      )}
      {value && !canDefault && value.provider !== "mock" && options.length === 0 && entry?.status === "ready" && (
        <span className="w-full font-ui text-[12px] text-muted">Enable some {PROVIDER_LABELS[value.provider]} models in the model library first.</span>
      )}
    </div>
  );
}
