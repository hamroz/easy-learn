"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Dots } from "@/components/ui/Spinner";

type ProviderId = "codex-cli" | "claude-cli" | "mock";
type Health = { id: ProviderId; ok: boolean; message: string; fix?: string };

const PROVIDERS: { id: ProviderId; name: string; description: string; cmd?: string }[] = [
  {
    id: "codex-cli",
    name: "Codex",
    description: "Uses your ChatGPT subscription through the official Codex CLI.",
    cmd: "docker compose exec -it web codex login --device-auth",
  },
  {
    id: "claude-cli",
    name: "Claude",
    description: "Uses your Claude subscription through the official Claude Code CLI. Personal use only.",
    cmd: "docker compose exec -it web claude   # then type /login",
  },
  { id: "mock", name: "Sample content", description: "Offline canned lessons for trying the interface. No AI." },
];

export function SettingsForm({
  initial,
  defaultProvider,
}: {
  initial: { provider: ProviderId | null; lessonModel: string; chatModel: string; language: string };
  defaultProvider: ProviderId;
}) {
  const [form, setForm] = useState({ ...initial, provider: initial.provider ?? defaultProvider });
  const [health, setHealth] = useState<Health[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const loadHealth = () => {
    setHealth(null);
    api<{ providers: Health[] }>("/api/providers/health")
      .then((r) => setHealth(r.providers))
      .catch(() => setHealth([]));
  };
  useEffect(loadHealth, []);

  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await api("/api/settings", { method: "PUT", body: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 space-y-12">
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-ui text-[13px] font-medium uppercase tracking-[0.14em] text-muted">AI provider</h2>
          <button onClick={loadHealth} className="font-ui text-[13px] text-muted hover:text-text">
            Check again
          </button>
        </div>
        <div role="radiogroup" className="mt-4 space-y-3">
          {PROVIDERS.map((p) => {
            const h = health?.find((x) => x.id === p.id);
            const selected = form.provider === p.id;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                key={p.id}
                onClick={() => setForm({ ...form, provider: p.id })}
                className={`block w-full rounded-2xl border p-4 text-left transition ${selected ? "border-accent bg-surface ring-4 ring-accent/10" : "border-border bg-surface/60 hover:border-muted/50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-ui text-[15px] font-medium">{p.name}</span>
                  <span className="flex items-center gap-2 font-ui text-[12px] text-muted">
                    {!health ? (
                      <Dots />
                    ) : h?.ok ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-[#2f9e44]" /> Ready
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-[#e8590c]" /> Not ready
                      </>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-[14px] text-muted">{p.description}</p>
                {health && h && !h.ok && (
                  <div className="mt-3 rounded-xl bg-border/40 px-3 py-2 font-ui text-[12.5px] text-muted">
                    <div>{h.message}</div>
                    {p.cmd && (
                      <code className="mt-1.5 block select-all font-mono text-[12px] text-text">{p.cmd}</code>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-ui text-[13px] font-medium uppercase tracking-[0.14em] text-muted">Models &amp; language</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="lm" hint="optional">Model for lessons</Label>
            <Input id="lm" placeholder="Provider default" value={form.lessonModel} onChange={(e) => setForm({ ...form, lessonModel: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cm" hint="optional">Model for questions</Label>
            <Input id="cm" placeholder="Provider default" value={form.chatModel} onChange={(e) => setForm({ ...form, chatModel: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="lang" hint="e.g. en, ru, de">Course language</Label>
          <Input id="lang" placeholder="Match the language I write in" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
        </div>
      </section>

      <div className="flex items-center gap-4">
        <Button onClick={save} loading={busy}>
          Save settings
        </Button>
        {saved && <span className="font-ui text-[13px] text-muted">Saved</span>}
        {error && <span className="font-ui text-[13px] text-[#b42318]">{error}</span>}
      </div>
    </div>
  );
}
