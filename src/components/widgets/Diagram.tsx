"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BlockOf } from "@/content/blocks";
import { Markdown } from "@/components/reader/Markdown";
import { applyVisibility, scopeSvg } from "@/lib/svg";
import { NavButton, PillButton, WidgetFrame } from "./WidgetFrame";

export function Diagram({ block }: { block: BlockOf<"diagram"> }) {
  const ref = useRef<HTMLDivElement>(null);
  const svg = useMemo(() => scopeSvg(block.svg, block.id), [block.svg, block.id]);
  const steps = block.steps ?? [];
  const controlled = useMemo(() => new Set(steps.flatMap((s) => s.show)), [steps]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (steps.length) applyVisibility(ref.current, block.id, controlled, new Set(steps[step]?.show ?? []));
  }, [step, steps, controlled, block.id]);

  return (
    <WidgetFrame caption={block.caption} label={steps.length ? "Step through" : undefined}>
      <div ref={ref} className="svg-host px-4 py-5 sm:px-8" dangerouslySetInnerHTML={{ __html: svg }} />
      {steps.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <NavButton dir="prev" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} />
            <div className="flex flex-1 flex-wrap justify-center gap-1.5">
              {steps.map((s, i) => (
                <PillButton key={i} active={i === step} onClick={() => setStep(i)}>
                  {s.label}
                </PillButton>
              ))}
            </div>
            <NavButton dir="next" onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1} />
          </div>
          {steps[step]?.md && (
            <p key={step} className="mt-3 animate-fade-up text-center font-[family-name:var(--font-body)] text-[16px] leading-relaxed text-text">
              <Markdown md={steps[step].md!} />
            </p>
          )}
        </div>
      )}
    </WidgetFrame>
  );
}
