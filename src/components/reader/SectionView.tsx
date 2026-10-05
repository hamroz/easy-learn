"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { SectionJson } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dots } from "@/components/ui/Spinner";
import { BlockBoundary } from "./BlockBoundary";
import { BlockView, type BlockViewProps } from "./BlockView";

export function SectionView({
  section,
  index,
  onRetried,
  paragraphProps,
}: {
  section: SectionJson;
  index: number;
  onRetried: () => void;
  paragraphProps?: (sectionId: string, blockId: string) => Pick<BlockViewProps, "paragraphMd" | "paragraphAside" | "variantId">;
}) {
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    await api(`/api/sections/${section.id}/retry`, { body: {} }).catch(() => {});
    onRetried();
    setRetrying(false);
  };

  return (
    <section id={`section-${section.id}`} data-section-heading={section.heading} className="scroll-mt-24">
      <div className="mb-2 mt-20 font-ui text-[12px] font-medium tabular-nums tracking-[0.16em] text-accent">{String(index + 1).padStart(2, "0")}</div>
      <h2 className="font-[family-name:var(--font-heading)] text-[28px] leading-[1.2] tracking-tight text-text sm:text-[32px]">{section.heading}</h2>

      {section.status === "ready" && (
        <div className="animate-fade-up">
          {section.blocks.map((b) => (
            <BlockBoundary key={b.id}>
              <BlockView block={b} sectionId={section.id} {...(b.type === "paragraph" ? paragraphProps?.(section.id, b.id) : {})} />
            </BlockBoundary>
          ))}
        </div>
      )}

      {(section.status === "pending" || section.status === "generating") && <SectionSkeleton writing={section.status === "generating"} />}

      {section.status === "failed" && (
        <div className="my-8 rounded-[var(--radius)] border border-border bg-surface p-5 font-ui">
          <p className="text-[15px] text-text">This section could not be written.</p>
          {section.error && <p className="mt-1 line-clamp-3 text-[13px] text-muted">{section.error}</p>}
          <Button className="mt-4" size="sm" variant="secondary" onClick={retry} loading={retrying}>
            Try again
          </Button>
        </div>
      )}
    </section>
  );
}

function SectionSkeleton({ writing }: { writing: boolean }) {
  return (
    <div className="my-6" aria-busy>
      <p className="mb-5 flex items-center gap-2 font-ui text-[13px] text-muted">
        {writing ? "Writing this section" : "Waiting to be written"} <Dots />
      </p>
      {[96, 100, 88, 0, 100, 92, 70].map((w, i) =>
        w === 0 ? <div key={i} className="h-6" /> : <div key={i} className="shimmer mb-3 h-[14px] rounded-md" style={{ width: `${w}%` }} />,
      )}
    </div>
  );
}
