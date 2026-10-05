"use client";

import { useEffect, useRef, useState } from "react";
import type { BlockOf } from "@/content/blocks";
import { Markdown } from "@/components/reader/Markdown";
import { renderTex } from "@/lib/math";
import { WidgetFrame } from "./WidgetFrame";

/** A formula whose parts (\htmlClass{pN}{…}) light up and explain themselves. */
export function Formula({ block }: { block: BlockOf<"formula"> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const ids = block.parts.map((p) => p.id);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    for (const id of ids)
      root.querySelectorAll(`.${id}`).forEach((el) => {
        (el as HTMLElement).dataset.part = id === active ? "active" : active ? "dim" : "";
      });
  }, [active, ids]);

  const partFromEvent = (target: EventTarget | null) => {
    let el = target as HTMLElement | null;
    while (el && el !== ref.current) {
      const hit = ids.find((id) => el!.classList?.contains(id));
      if (hit) return hit;
      el = el.parentElement;
    }
    return null;
  };

  const part = block.parts.find((p) => p.id === active);
  return (
    <WidgetFrame caption={block.caption} label="Read the formula">
      <div
        ref={ref}
        className="formula-host overflow-x-auto px-5 py-8 text-center text-[1.5em] text-text"
        onMouseOver={(e) => setActive(partFromEvent(e.target) ?? active)}
        onClick={(e) => setActive(partFromEvent(e.target))}
        dangerouslySetInnerHTML={{ __html: renderTex(block.tex, true) }}
      />
      <div className="border-t border-border px-5 py-4 sm:px-8">
        <div className="flex flex-wrap justify-center gap-2">
          {block.parts.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseEnter={() => setActive(p.id)}
              onFocus={() => setActive(p.id)}
              onClick={() => setActive(p.id)}
              className={`rounded-full border px-3 py-1.5 text-[13px] transition ${active === p.id ? "border-accent bg-accent/10 text-text" : "border-border text-muted hover:text-text"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p key={active ?? "none"} className="mx-auto mt-4 min-h-[3.2em] max-w-[52ch] animate-fade-up text-center font-[family-name:var(--font-body)] text-[16.5px] leading-relaxed text-text">
          {part ? <Markdown md={part.md} /> : <span className="text-muted">Hover or tap a part of the formula.</span>}
        </p>
      </div>
    </WidgetFrame>
  );
}
