"use client";

import { useState } from "react";
import type { BlockOf } from "@/content/blocks";
import { Markdown } from "@/components/reader/Markdown";
import { WidgetFrame } from "./WidgetFrame";

/** Concept cards that flip to reveal an explanation. */
export function Cards({ block }: { block: BlockOf<"cards"> }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    const next = new Set(flipped);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setFlipped(next);
  };
  return (
    <WidgetFrame caption={block.caption ?? "Tap a card to turn it over."} label="Key ideas">
      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        {block.cards.map((c, i) => (
          <button key={i} type="button" onClick={() => toggle(i)} aria-pressed={flipped.has(i)} className="group text-left [perspective:1200px]">
            <div
              className={`grid transition-transform duration-500 [transform-style:preserve-3d] ${flipped.has(i) ? "[transform:rotateY(180deg)]" : ""}`}
            >
              <div className="flex min-h-[132px] flex-col justify-between rounded-[var(--radius)] border border-border bg-bg p-5 [backface-visibility:hidden] [grid-area:1/1] group-hover:border-muted/50">
                <span className="font-[family-name:var(--font-heading)] text-[20px] leading-snug text-text">{c.front}</span>
                <span className="mt-4 text-[12px] text-muted">Turn over ↻</span>
              </div>
              <div className="flex min-h-[132px] items-center rounded-[var(--radius)] border border-accent/40 bg-accent/[0.06] p-5 [backface-visibility:hidden] [grid-area:1/1] [transform:rotateY(180deg)]">
                <span className="font-[family-name:var(--font-body)] text-[15.5px] leading-relaxed text-text">
                  <Markdown md={c.back} />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </WidgetFrame>
  );
}
