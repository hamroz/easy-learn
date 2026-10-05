"use client";

import { useMemo, useState } from "react";
import type { BlockOf } from "@/content/blocks";
import { Markdown } from "@/components/reader/Markdown";
import { scopeSvg } from "@/lib/svg";
import { NavButton, WidgetFrame } from "./WidgetFrame";

export function Steps({ block }: { block: BlockOf<"steps"> }) {
  const [i, setI] = useState(0);
  const svgs = useMemo(() => block.steps.map((s, n) => (s.svg ? scopeSvg(s.svg, `${block.id}-${n}`) : null)), [block.steps, block.id]);
  const s = block.steps[i];
  return (
    <WidgetFrame caption={block.caption}>
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <div className="flex flex-1 items-center gap-1.5" aria-hidden>
          {block.steps.map((_, n) => (
            <button key={n} type="button" tabIndex={-1} onClick={() => setI(n)} className={`h-1.5 flex-1 rounded-full transition ${n <= i ? "bg-accent" : "bg-border"}`} />
          ))}
        </div>
        <span className="text-[12px] tabular-nums text-muted">
          {i + 1} / {block.steps.length}
        </span>
      </div>
      <div key={i} className="animate-fade-up px-5 py-6 sm:px-8">
        <div className="font-[family-name:var(--font-heading)] text-[21px] text-text">{s.title}</div>
        {svgs[i] && <div className="svg-host mt-4" dangerouslySetInnerHTML={{ __html: svgs[i]! }} />}
        <p className="mt-3 font-[family-name:var(--font-body)] text-[17px] leading-relaxed text-text">
          <Markdown md={s.md} />
        </p>
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <NavButton dir="prev" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} />
        <NavButton dir="next" onClick={() => setI(Math.min(block.steps.length - 1, i + 1))} disabled={i === block.steps.length - 1} />
      </div>
    </WidgetFrame>
  );
}
