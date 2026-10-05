"use client";

import { useState } from "react";
import type { BlockOf } from "@/content/blocks";
import { Markdown } from "@/components/reader/Markdown";
import { WidgetFrame } from "./WidgetFrame";

export function Timeline({ block }: { block: BlockOf<"timeline"> }) {
  const [sel, setSel] = useState(0);
  const ev = block.events[sel];
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setSel(Math.min(block.events.length - 1, sel + 1));
    if (e.key === "ArrowLeft") setSel(Math.max(0, sel - 1));
  };
  return (
    <WidgetFrame caption={block.caption} label="Timeline">
      <div className="overflow-x-auto px-4 pb-2 pt-6 sm:px-8" onKeyDown={onKey}>
        <div className="relative flex min-w-max gap-0" role="tablist" aria-label="Events">
          <div className="absolute left-0 right-0 top-[7px] h-px bg-border" />
          {block.events.map((e, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === sel}
              onClick={() => setSel(i)}
              className="group relative flex w-32 flex-col items-center px-2 text-center sm:w-36"
            >
              <span
                className={`relative z-[1] h-[15px] w-[15px] rounded-full border-2 transition ${
                  i === sel ? "scale-110 border-accent bg-accent" : i < sel ? "border-accent bg-surface" : "border-border bg-surface group-hover:border-muted"
                }`}
              />
              <span className={`mt-3 text-[13px] font-medium tabular-nums ${i === sel ? "text-accent" : "text-muted"}`}>{e.date}</span>
              <span className={`mt-1 line-clamp-2 text-[12.5px] leading-snug ${i === sel ? "text-text" : "text-muted"}`}>{e.title}</span>
            </button>
          ))}
        </div>
      </div>
      <div key={sel} className="animate-fade-up border-t border-border px-5 py-5 sm:px-8">
        <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{ev.date}</div>
        <div className="mt-1 font-[family-name:var(--font-heading)] text-[21px] leading-snug text-text">{ev.title}</div>
        <p className="mt-2 font-[family-name:var(--font-body)] text-[16.5px] leading-relaxed text-text">
          <Markdown md={ev.md} />
        </p>
      </div>
    </WidgetFrame>
  );
}
