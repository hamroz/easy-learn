"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/Field";
import { FORMATS, type FormatId, formatInfo } from "@/content/formats";

const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
] as const;

const SUGGESTIONS = [
  "The theory of relativity",
  "How neural networks learn",
  "The history of the Silk Road",
  "Why the sky is blue",
  "Quantum entanglement, gently",
  "How the stock market actually works",
];

export function NewCourseForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]["id"]>("beginner");
  const [format, setFormat] = useState<FormatId>("course");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea with its content.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [topic]);

  const submit = async () => {
    if (topic.trim().length < 2 || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const { course } = await api<{ course: { id: string } }>("/api/courses", { body: { topic, level, format } });
      router.push(`/courses/${course.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div>
      <div role="radiogroup" aria-label="Format" className="mb-4 flex flex-wrap justify-center gap-1.5 font-ui text-[13px]">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={format === f.id}
            onClick={() => setFormat(f.id)}
            title={f.minutes}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition ${
              format === f.id ? "border-text bg-text text-bg" : "border-border text-muted hover:border-muted/50 hover:text-text"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={f.icon} />
            </svg>
            {f.label}
          </button>
        ))}
      </div>
      <div className="rounded-[28px] border border-border bg-surface p-2 shadow-[0_1px_0_rgba(0,0,0,0.02),0_30px_80px_-40px_rgba(0,0,0,0.35)] transition focus-within:border-accent/60 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_14%,transparent),0_30px_80px_-40px_rgba(0,0,0,0.35)]">
        <textarea
          ref={ref}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder={formatInfo(format).placeholder}
          aria-label="What do you want to learn?"
          className="block min-h-[88px] w-full resize-none bg-transparent px-5 pt-4 pb-2 focus-visible:outline-none font-[family-name:var(--font-newsreader)] text-[21px] leading-relaxed text-text outline-none placeholder:text-muted/60"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-2 pt-1">
          <div role="radiogroup" aria-label="Level" className="flex rounded-full bg-border/40 p-1 font-ui text-[13px]">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={level === l.id}
                onClick={() => setLevel(l.id)}
                className={`rounded-full px-3 py-1.5 transition ${level === l.id ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <Button onClick={submit} loading={busy} disabled={topic.trim().length < 2} className="rounded-full pl-5 pr-4">
            {format === "course" ? "Create course" : `Create ${formatInfo(format).noun}`}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Button>
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-9 flex flex-wrap justify-center gap-2.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setTopic(s);
              ref.current?.focus();
            }}
            className="rounded-full border border-border px-3.5 py-1.5 font-ui text-[13px] text-muted transition hover:border-muted/50 hover:text-text"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
