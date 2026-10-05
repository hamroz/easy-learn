"use client";

import { useState } from "react";
import type { BlockOf } from "@/content/blocks";
import { Markdown } from "@/components/reader/Markdown";
import { WidgetFrame } from "./WidgetFrame";

/** "Pause and think" — never graded, just a moment to guess before reading on. */
export function Reveal({ block }: { block: BlockOf<"reveal"> }) {
  const [open, setOpen] = useState(false);
  return (
    <WidgetFrame caption={block.caption} wide={false}>
      <div className="p-5 sm:p-6">
        <div className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-accent">Pause and think</div>
        <p className="mt-2 font-[family-name:var(--font-body)] text-[18px] leading-relaxed text-text">
          <Markdown md={block.prompt} />
        </p>
        {open ? (
          <p className="mt-4 animate-fade-up border-l-2 border-accent pl-4 font-[family-name:var(--font-body)] text-[17px] leading-relaxed text-text">
            <Markdown md={block.answer} />
          </p>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="mt-4 rounded-full border border-border px-4 py-2 text-[13px] text-text transition hover:bg-border/40">
            Show me
          </button>
        )}
      </div>
    </WidgetFrame>
  );
}
