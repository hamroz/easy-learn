"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import type { CourseViewJson } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/Field";
import { Dots } from "@/components/ui/Spinner";

type Item = { key: string; title: string; summary: string };
let seq = 0;
const newKey = () => `new-${++seq}`;

/** Grow a textarea to fit its content. */
function fit(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
}

export function OutlineEditor({ course, lessons }: { course: CourseViewJson["course"]; lessons: CourseViewJson["lessons"] }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(lessons.map((l) => ({ key: l.id, title: l.title, summary: l.summary })));
  const [dirty, setDirty] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<"save" | "start" | "reshape" | null>(null);
  const [error, setError] = useState<string>();
  const dragFrom = useRef<number | null>(null);
  const reshaping = course.busy === "reshaping";

  const update = (next: Item[]) => {
    setItems(next);
    setDirty(true);
  };
  const edit = (i: number, patch: Partial<Item>) => update(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    update(next);
  };

  const save = async () => {
    const clean = items.filter((i) => i.title.trim());
    if (!clean.length) throw new Error("Keep at least one lesson");
    await api(`/api/courses/${course.id}/lessons`, {
      method: "PUT",
      body: { lessons: clean.map((i) => ({ title: i.title, summary: i.summary })) },
    });
    setDirty(false);
  };

  const run = async (kind: "save" | "start" | "reshape") => {
    setBusy(kind);
    setError(undefined);
    try {
      if (dirty) await save();
      if (kind === "start") {
        await api(`/api/courses/${course.id}/start`, { body: {} });
        router.refresh();
        return;
      }
      if (kind === "reshape") {
        await api(`/api/courses/${course.id}/reshape`, { body: { instruction } });
        setInstruction("");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={reshaping ? "pointer-events-none" : ""}>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="font-ui text-[13px] font-medium uppercase tracking-[0.14em] text-muted">Your path</h2>
        <span className="font-ui text-[12.5px] text-muted">Edit anything — titles, order, what each lesson covers.</span>
      </div>

      {reshaping && (
        <p className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 font-ui text-[14px] text-muted">
          Reshaping the outline <Dots />
        </p>
      )}

      <ol className={`space-y-3 transition-opacity ${reshaping ? "opacity-50" : ""}`}>
        {items.map((it, i) => (
          <li
            key={it.key}
            draggable
            onDragStart={() => (dragFrom.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom.current !== null) move(dragFrom.current, i);
              dragFrom.current = null;
            }}
            className="group relative flex gap-4 rounded-2xl border border-border bg-surface p-4 pr-3 transition hover:border-muted/40"
          >
            <span className="mt-1 w-6 shrink-0 cursor-grab text-right font-[family-name:var(--font-heading)] text-[20px] leading-none text-muted/70 active:cursor-grabbing" title="Drag to reorder">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <textarea
                ref={fit}
                rows={1}
                value={it.title}
                onChange={(e) => {
                  edit(i, { title: e.target.value });
                  fit(e.target);
                }}
                placeholder="Lesson title"
                aria-label={`Lesson ${i + 1} title`}
                className="block w-full resize-none bg-transparent font-[family-name:var(--font-heading)] text-[20px] leading-snug text-text outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-4 focus-visible:ring-offset-surface placeholder:text-muted/50"
              />
              <textarea
                ref={fit}
                rows={1}
                value={it.summary}
                onChange={(e) => {
                  edit(i, { summary: e.target.value });
                  fit(e.target);
                }}
                placeholder="What this lesson covers (optional)"
                aria-label={`Lesson ${i + 1} summary`}
                className="mt-1 block w-full resize-none bg-transparent text-[15px] leading-relaxed text-muted outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-4 focus-visible:ring-offset-surface placeholder:text-muted/50"
              />
            </div>
            <div className="flex shrink-0 flex-col items-center gap-0.5 opacity-40 transition group-hover:opacity-100 group-focus-within:opacity-100">
              <IconButton label="Move up" onClick={() => move(i, i - 1)} d="M12 19V5M6 11l6-6 6 6" />
              <IconButton label="Move down" onClick={() => move(i, i + 1)} d="M12 5v14M6 13l6 6 6-6" />
              <IconButton label="Remove lesson" onClick={() => update(items.filter((_, j) => j !== i))} d="M6 6l12 12M18 6L6 18" />
            </div>
          </li>
        ))}
      </ol>

      <button
        onClick={() => update([...items, { key: newKey(), title: "", summary: "" }])}
        className="mt-3 w-full rounded-2xl border border-dashed border-border py-3 font-ui text-[14px] text-muted transition hover:border-muted/60 hover:text-text"
      >
        + Add a lesson
      </button>

      <div className="mt-10 rounded-2xl border border-border bg-surface p-4">
        <label htmlFor="reshape" className="font-ui text-[13px] font-medium text-text">
          Want a different path?
        </label>
        <textarea
          id="reshape"
          rows={2}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Less math, more intuition · Add a lesson on black holes · Make it shorter…"
          className="mt-2 block w-full resize-none bg-transparent text-[15px] leading-relaxed text-text outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-4 focus-visible:ring-offset-surface placeholder:text-muted/60"
        />
        <div className="mt-2 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => run("reshape")} loading={busy === "reshape"} disabled={instruction.trim().length < 2}>
            Reshape outline
          </Button>
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="mt-10 flex flex-wrap items-center justify-end gap-3">
        {dirty && (
          <Button variant="ghost" onClick={() => run("save")} loading={busy === "save"}>
            Save changes
          </Button>
        )}
        <Button size="lg" onClick={() => run("start")} loading={busy === "start"} className="rounded-full">
          Start learning
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, d }: { label: string; onClick: () => void; d: string }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-border/50 hover:text-text">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d={d} />
      </svg>
    </button>
  );
}
