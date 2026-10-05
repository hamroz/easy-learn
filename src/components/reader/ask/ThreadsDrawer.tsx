"use client";

import { useEffect } from "react";
import type { ThreadJson } from "@/lib/types";
import { mdToText } from "@/content/text";

export function ThreadsDrawer({ threads, onClose, onSelect }: { threads: ThreadJson[]; onClose: () => void; onSelect: (t: ThreadJson) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="My questions">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
      <aside className="relative flex h-full w-full max-w-md animate-fade-up flex-col border-l border-border bg-surface font-ui shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-[family-name:var(--font-heading)] text-[22px] text-text">My questions</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-border/50 hover:text-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <ol className="flex-1 space-y-2 overflow-y-auto p-3">
          {threads.map((t) => {
            const q = t.messages.find((m) => m.role === "user");
            const a = t.messages.find((m) => m.role === "assistant");
            return (
              <li key={t.id}>
                <button onClick={() => onSelect(t)} className="block w-full rounded-xl p-3 text-left transition hover:bg-border/40">
                  <p className="line-clamp-2 border-l-2 border-accent pl-3 font-[family-name:var(--font-body)] text-[14px] italic text-muted">{t.anchor.quote}</p>
                  {q && <p className="mt-2 text-[14px] font-medium text-text">{q.content}</p>}
                  {a && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{mdToText(a.content)}</p>}
                  <p className="mt-1.5 text-[12px] text-muted">{t.messages.length} messages</p>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
