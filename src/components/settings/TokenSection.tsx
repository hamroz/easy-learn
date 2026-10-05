"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

/** Personal access token so Claude Code (or a script) can create courses through the authoring API. */
export function TokenSection({ initiallySet }: { initiallySet: boolean }) {
  const [set, setSet] = useState(initiallySet);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (set && !confirm("Replace the current token? Anything using the old one will stop working.")) return;
    setBusy(true);
    const r = await api<{ token: string }>("/api/settings/token", { body: {} }).finally(() => setBusy(false));
    setToken(r.token);
    setSet(true);
  };
  const revoke = async () => {
    if (!confirm("Revoke the token?")) return;
    await api("/api/settings/token", { method: "DELETE" });
    setSet(false);
    setToken(null);
  };

  return (
    <div className="space-y-3 font-ui">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[14px] text-muted">{set ? "A token is active." : "No token yet."}</span>
        <Button size="sm" onClick={create} loading={busy}>
          {set ? "Replace token" : "Create token"}
        </Button>
        {set && (
          <Button size="sm" variant="danger" onClick={revoke}>
            Revoke
          </Button>
        )}
      </div>
      {token && (
        <div className="rounded-2xl border border-accent/40 bg-accent/[0.05] p-4 text-[13px] text-text">
          <p className="font-medium">Copy it now — it won&apos;t be shown again.</p>
          <code className="mt-2 block select-all break-all rounded-lg bg-surface px-3 py-2 font-mono text-[12px]">{token}</code>
          <p className="mt-3 text-muted">
            Add it to the project&apos;s <code className="font-mono">.env.local</code> as <code className="font-mono">EASY_LEARN_TOKEN=…</code> (and{" "}
            <code className="font-mono">EASY_LEARN_URL={typeof window !== "undefined" ? window.location.origin : ""}</code>), then ask Claude Code to write you a course.
          </p>
        </div>
      )}
    </div>
  );
}
