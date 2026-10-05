"use client";

import type { Block, LibraryWidget } from "@/content/blocks";
import { Cards } from "@/components/widgets/Cards";
import { Chart } from "@/components/widgets/Chart";
import { Compare } from "@/components/widgets/Compare";
import { CustomWidget } from "@/components/widgets/CustomWidget";
import { Diagram } from "@/components/widgets/Diagram";
import { Formula } from "@/components/widgets/Formula";
import { Plot } from "@/components/widgets/Plot";
import { Reveal } from "@/components/widgets/Reveal";
import { Scrolly } from "@/components/widgets/Scrolly";
import { Steps } from "@/components/widgets/Steps";
import { Timeline } from "@/components/widgets/Timeline";
import { DisplayMath, Markdown } from "./Markdown";

const CALLOUT_LABEL = { insight: "Insight", analogy: "Analogy", history: "A little history", example: "Example", caution: "Careful" } as const;
const CALLOUT_ICON = {
  insight: "M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3zM9.5 20h5",
  analogy: "M4 12h6M14 12h6M10 9l-3 3 3 3M14 9l3 3-3 3",
  history: "M12 7v5l3 2M21 12a9 9 0 1 1-3-6.7M21 4v4h-4",
  example: "M9 18l6-6-6-6",
  caution: "M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
} as const;

export type BlockViewProps = {
  block: Block;
  sectionId: string;
  /** Override for paragraph text (a simpler/deeper variant). */
  paragraphMd?: string;
  /** Rendered after a paragraph (e.g. its variant switcher). */
  paragraphAside?: React.ReactNode;
};

/** Text blocks carry data-block-id + data-selectable so ask-about-selection can anchor to them. */
export function BlockView({ block, sectionId, paragraphMd, paragraphAside }: BlockViewProps) {
  const sel = { "data-block-id": block.id, "data-section-id": sectionId, "data-selectable": "" };
  switch (block.type) {
    case "paragraph":
      return (
        <div className="group/para relative">
          <p {...sel} className="reader-text my-6">
            <Markdown md={paragraphMd ?? block.md} />
          </p>
          {paragraphAside}
        </div>
      );
    case "heading":
      return <h3 className="mb-2 mt-12 font-[family-name:var(--font-heading)] text-[23px] leading-snug tracking-tight text-text">{block.text}</h3>;
    case "callout":
      return (
        <aside className="my-9 rounded-[var(--radius)] border border-border bg-surface/70 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2 font-ui text-[11.5px] font-medium uppercase tracking-[0.14em] text-accent">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={CALLOUT_ICON[block.variant]} />
            </svg>
            {block.title ?? CALLOUT_LABEL[block.variant]}
          </div>
          <p {...sel} className="reader-text mt-2 !text-[17.5px]">
            <Markdown md={block.md} />
          </p>
        </aside>
      );
    case "math":
      return <DisplayMath tex={block.tex} className="my-8 text-[1.08em] text-text" />;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag {...sel} className={`reader-text my-6 space-y-2 pl-6 ${block.ordered ? "list-decimal" : "list-disc"} marker:text-muted`}>
          {block.items.map((it, i) => (
            <li key={i} className="pl-1">
              <Markdown md={it} />
            </li>
          ))}
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote className="my-10 border-l-2 border-accent pl-6">
          <p {...sel} className="reader-text font-[family-name:var(--font-heading)] !text-[22px] italic !leading-snug">
            <Markdown md={block.md} />
          </p>
          {block.cite && <footer className="mt-3 font-ui text-[13px] text-muted">— {block.cite}</footer>}
        </blockquote>
      );
    case "code":
      return (
        <pre className="my-8 overflow-x-auto rounded-[var(--radius)] border border-border bg-surface px-5 py-4 font-mono text-[13.5px] leading-relaxed text-text">
          <code>{block.code}</code>
        </pre>
      );
    case "custom":
      return <CustomWidget block={block} renderFallback={(fb) => <LibraryWidgetView block={fb} />} />;
    default:
      return <LibraryWidgetView block={block} />;
  }
}

export function LibraryWidgetView({ block }: { block: LibraryWidget }) {
  switch (block.type) {
    case "diagram":
      return <Diagram block={block} />;
    case "scrolly":
      return <Scrolly block={block} />;
    case "plot":
      return <Plot block={block} />;
    case "chart":
      return <Chart block={block} />;
    case "timeline":
      return <Timeline block={block} />;
    case "formula":
      return <Formula block={block} />;
    case "compare":
      return <Compare block={block} />;
    case "cards":
      return <Cards block={block} />;
    case "reveal":
      return <Reveal block={block} />;
    case "steps":
      return <Steps block={block} />;
    default:
      return null;
  }
}
