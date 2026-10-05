"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export function AddExamplesButton({ variant = "secondary" }: { variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  const add = async () => {
    setBusy(true);
    try {
      const { added } = await api<{ added: number }>("/api/examples", { body: {} });
      setNote(added ? `Added ${added} example course${added > 1 ? "s" : ""}.` : "You already have all the examples.");
      router.refresh();
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="inline-flex items-center gap-3">
      <Button variant={variant} size="sm" onClick={add} loading={busy}>
        Add example courses
      </Button>
      {note && <span className="font-ui text-[13px] text-muted">{note}</span>}
    </span>
  );
}
