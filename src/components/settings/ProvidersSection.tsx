"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PROVIDER_LABELS, type ProviderKey } from "@/content/ai";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { Dots } from "@/components/ui/Spinner";

type Health = { id: ProviderKey; ok: boolean; message: string; fix?: string };

const ABOUT: Partial<Record<ProviderKey, string>> = {
  "codex-cli": "Your ChatGPT subscription through the official Codex CLI.",
  "opencode-cli": "Any model OpenCode is signed in to (OpenCode Zen, OpenRouter, DeepSeek, …).",
  openrouter: "Hundreds of models through your own OpenRouter API key.",
  mock: "Offline sample content for trying the interface.",
};

const DOCKER: Partial<Record<ProviderKey, string>> = {
  "codex-cli": "docker compose exec -it web codex login --device-auth",
  "opencode-cli": "docker compose exec -it web opencode providers login",
};

export function ProvidersSection({ openrouter }: { openrouter: { set: boolean; last4: string | null } }) {
  const [health, setHealth] = useState<Health[] | null>(null);
  const [key, setKey] = useState("");
  const [orStatus, setOrStatus] = useState(openrouter);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const check = () => {
    setHealth(null);
    api<{ providers: Health[] }>("/api/providers/health")
      .then((r) => setHealth(r.providers))
      .catch(() => setHealth([]));
  };
  useEffect(check, []);

  const saveKey = async (value: string | null) => {
    setBusy(true);
    setError(undefined);
    try {
      const r = await api<{ openrouter: typeof openrouter }>("/api/settings/openrouter-key", { method: "PUT", body: { key: value } });
      setOrStatus(r.openrouter);
      setKey("");
      check();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 font-ui">
      {(["codex-cli", "opencode-cli", "openrouter", "mock"] as ProviderKey[]).map((p) => {
        const h = health?.find((x) => x.id === p);
        return (
          <div key={p} className="rounded-2xl border border-border bg-surface/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[15px] font-medium text-text">{PROVIDER_LABELS[p]}</span>
              <span className="flex items-center gap-2 text-[12px] text-muted">
                {!health ? <Dots /> : <><span className={`h-2 w-2 rounded-full ${h?.ok ? "bg-[#2f9e44]" : "bg-[#e8590c]"}`} />{h?.message ?? "Unknown"}</>}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] text-muted">{ABOUT[p]}</p>
            {health && h && !h.ok && DOCKER[p] && (
              <div className="mt-3 rounded-xl bg-border/40 px-3 py-2 text-[12.5px] text-muted">
                Sign in from a terminal:
                <code className="mt-1 block select-all font-mono text-[12px] text-text">{DOCKER[p]}</code>
                <span className="mt-1 block">Running without Docker? Drop the <code className="font-mono">docker compose exec -it web</code> part.</span>
              </div>
            )}
            {p === "openrouter" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {orStatus.set && <span className="text-[13px] text-muted">Key saved ••••{orStatus.last4}</span>}
                <input
                  type="password"
                  autoComplete="off"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={orStatus.set ? "Paste a new key to replace it" : "Paste your OpenRouter key (sk-or-…)"}
                  className={`${inputClass} max-w-sm`}
                />
                <Button size="sm" onClick={() => saveKey(key)} loading={busy} disabled={key.trim().length < 10}>
                  Save key
                </Button>
                {orStatus.set && (
                  <Button size="sm" variant="danger" onClick={() => saveKey(null)}>
                    Remove
                  </Button>
                )}
                {error && <span className="w-full text-[13px] text-[#b42318]">{error}</span>}
              </div>
            )}
          </div>
        );
      })}
      <button onClick={check} className="text-[13px] text-muted hover:text-text">
        Check again
      </button>
    </div>
  );
}
