import type { BlockOf } from "@/content/blocks";
import { Markdown } from "@/components/reader/Markdown";
import { WidgetFrame } from "./WidgetFrame";

export function Compare({ block }: { block: BlockOf<"compare"> }) {
  const cols = block.columns.length;
  return (
    <WidgetFrame caption={block.caption}>
      <div className={`grid divide-y divide-border sm:divide-x sm:divide-y-0 ${cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {block.columns.map((c, i) => (
          <div key={i} className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: i % 2 ? "var(--accent2)" : "var(--accent)" }} />
              <h4 className="font-[family-name:var(--font-heading)] text-[19px] text-text">{c.title}</h4>
            </div>
            <p className="mt-2 font-[family-name:var(--font-body)] text-[16px] leading-relaxed text-text">
              <Markdown md={c.md} />
            </p>
            {c.points && c.points.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-[14px] text-muted">
                {c.points.map((p, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-muted" />
                    <Markdown md={p} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
