"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ErrorText, Input, Label } from "@/components/ui/Field";

export function SetupForm({ initialToken }: { initialToken: string }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", token: initialToken });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api("/api/auth/setup", { body: form });
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-border bg-surface/80 p-7 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)] backdrop-blur">
      <p className="mb-5 text-[14px] leading-relaxed text-muted">Create the owner account. This page closes once an account exists.</p>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name" hint="optional">Your name</Label>
          <Input id="name" autoComplete="name" value={form.name} onChange={set("name")} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
        </div>
        <div>
          <Label htmlFor="password" hint="10+ characters">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" minLength={10} required value={form.password} onChange={set("password")} />
        </div>
        {!initialToken && (
          <div>
            <Label htmlFor="token" hint="SETUP_TOKEN from .env">Setup token</Label>
            <Input id="token" required value={form.token} onChange={set("token")} />
          </div>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" size="lg" className="mt-6 w-full" loading={busy}>
        Create account
      </Button>
    </form>
  );
}
