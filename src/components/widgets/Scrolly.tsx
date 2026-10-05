"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BlockOf } from "@/content/blocks";
import { Markdown } from "@/components/reader/Markdown";
import { applyVisibility, scopeSvg } from "@/lib/svg";

/** Sticky drawing beside text steps; the step nearest the middle of the screen drives the drawing. */
export function Scrolly({ block }: { block: BlockOf<"scrolly"> }) {
  const svgRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const svg = useMemo(() => scopeSvg(block.svg, block.id), [block.svg, block.id]);
  const controlled = useMemo(() => new Set(block.steps.flatMap((s) => s.show)), [block.steps]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    applyVisibility(svgRef.current, block.id, controlled, new Set(block.steps[active]?.show ?? []));
  }, [active, block.steps, controlled, block.id]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [block.steps.length]);

  return (
    <figure className="breakout my-14" data-widget>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-10">
        <div className="sticky top-16 z-[1] self-start md:top-24">
          <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.35)] sm:p-6">
            <div ref={svgRef} className="svg-host" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
              {block.steps.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-accent" : "w-1.5 bg-border"}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="md:py-[18vh]">
          {block.steps.map((s, i) => (
            <div
              key={i}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              data-step={i}
              className={`mb-[28vh] rounded-[var(--radius)] border px-5 py-4 font-[family-name:var(--font-body)] text-[18px] leading-relaxed transition duration-500 last:mb-0 ${
                i === active ? "border-accent/40 bg-surface text-text shadow-sm" : "border-transparent text-muted"
              }`}
            >
              <Markdown md={s.md} />
            </div>
          ))}
        </div>
      </div>
      {block.caption && (
        <figcaption className="mt-4 text-center font-[family-name:var(--font-body)] text-[14.5px] italic text-muted">
          <Markdown md={block.caption} />
        </figcaption>
      )}
    </figure>
  );
}
