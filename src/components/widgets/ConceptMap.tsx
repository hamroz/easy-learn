"use client";

import { useContext, useMemo, useState } from "react";
import type { BlockOf } from "@/content/blocks";
import { Markdown } from "@/components/reader/Markdown";
import { ReaderContext } from "@/components/reader/ReaderContext";
import { WidgetFrame } from "./WidgetFrame";

const W = 1000;
const H = 640;
const PAD_Y = 50;
const TINT = ["var(--accent)", "var(--accent2)", "var(--muted)", "var(--text)"];

type Node = BlockOf<"conceptMap">["nodes"][number];
const nodeWidth = (n: Node) => Math.max(90, n.label.length * 10.5 + 34);

/** An explorable map of how ideas connect. Select an idea to read about it (and open a quick bite on it). */
export function ConceptMap({ block }: { block: BlockOf<"conceptMap"> }) {
  const reader = useContext(ReaderContext);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [biteError, setBiteError] = useState<string | null>(null);

  const pos = useMemo(() => {
    // Keep the widest pill fully inside the canvas.
    const PAD_X = Math.max(...block.nodes.map((n) => nodeWidth(n))) / 2 + 16;
    const xs = block.nodes.map((n) => n.x);
    const ys = block.nodes.map((n) => n.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const sx = (v: number) => PAD_X + ((v - minX) / Math.max(1, maxX - minX)) * (W - 2 * PAD_X);
    const sy = (v: number) => PAD_Y + ((v - minY) / Math.max(1, maxY - minY)) * (H - 2 * PAD_Y);
    return new Map(block.nodes.map((n) => [n.id, { x: sx(n.x), y: sy(n.y) }]));
  }, [block.nodes]);

  const focus = hover ?? selected;
  const linked = new Set(block.edges.filter((e) => e.from === focus || e.to === focus).flatMap((e) => [e.from, e.to]));
  const node = block.nodes.find((n) => n.id === selected);

  const width = nodeWidth;

  return (
    <WidgetFrame caption={block.caption} label="Map">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[640px] select-none" role="img" aria-label="Concept map">
          {block.edges.map((e, i) => {
            const a = pos.get(e.from)!;
            const b = pos.get(e.to)!;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2 - Math.abs(a.x - b.x) * 0.12;
            const on = !focus || e.from === focus || e.to === focus;
            return (
              <g key={i} data-edge style={{ opacity: on ? 1 : 0.18, transition: "opacity 250ms" }}>
                <path d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} fill="none" stroke="var(--muted)" strokeWidth={2} strokeOpacity={0.6} />
                {e.label && (
                  <text x={mx} y={(a.y + b.y) / 2 - Math.abs(a.x - b.x) * 0.06 - 6} textAnchor="middle" fontSize={14} fill="var(--muted)">
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}
          {block.nodes.map((n) => {
            const p = pos.get(n.id)!;
            const w = width(n);
            const isSel = selected === n.id;
            const dim = focus && focus !== n.id && !linked.has(n.id);
            const tint = TINT[n.group ?? 0];
            return (
              <g
                key={n.id}
                data-node={n.id}
                role="button"
                tabIndex={0}
                aria-label={n.label}
                aria-pressed={isSel}
                onClick={() => setSelected(isSel ? null : n.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(isSel ? null : n.id)}
                onPointerEnter={() => setHover(n.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(n.id)}
                onBlur={() => setHover(null)}
                className="outline-none"
                style={{ cursor: "pointer", opacity: dim ? 0.35 : 1, transition: "opacity 250ms" }}
              >
                <rect x={p.x - w / 2} y={p.y - 22} width={w} height={44} rx={22} fill="var(--surface)" stroke={tint} strokeWidth={isSel || hover === n.id ? 3.5 : 2} />
                {isSel && <rect x={p.x - w / 2} y={p.y - 22} width={w} height={44} rx={22} fill={tint} opacity={0.12} />}
                <text x={p.x} y={p.y + 6} textAnchor="middle" fontSize={17} fill="var(--text)" fontWeight={isSel ? 600 : 400}>
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="min-h-[96px] border-t border-border px-5 py-4 sm:px-8">
        {node ? (
          <div key={node.id} className="animate-fade-up">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="font-[family-name:var(--font-heading)] text-[21px] text-text">{node.label}</div>
              {reader?.openBite && (
                <button
                  type="button"
                  disabled={opening}
                  onClick={async () => {
                    setOpening(true);
                    setBiteError(null);
                    try {
                      await reader.openBite!(node.id);
                    } catch (e) {
                      setBiteError((e as Error).message || "Could not open the quick bite");
                      setOpening(false);
                    }
                  }}
                  className="rounded-full bg-text px-3.5 py-1.5 text-[13px] text-bg transition hover:opacity-90 disabled:opacity-60"
                >
                  {opening ? "Opening…" : "Open a quick bite →"}
                </button>
              )}
            </div>
            <p className="mt-1.5 font-[family-name:var(--font-body)] text-[16.5px] leading-relaxed text-text">
              <Markdown md={node.summary} />
            </p>
            {biteError && <p className="mt-2 font-ui text-[13px] text-[color:var(--accent2)]">{biteError}</p>}
          </div>
        ) : (
          <p className="text-[14px] text-muted">Select an idea to read about it{reader?.openBite ? ", or open a two-minute quick bite on it" : ""}.</p>
        )}
      </div>
    </WidgetFrame>
  );
}
