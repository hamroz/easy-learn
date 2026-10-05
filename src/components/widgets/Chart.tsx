"use client";

import { scaleBand, scaleLinear, scalePoint } from "d3-scale";
import { line } from "d3-shape";
import { useMemo, useState } from "react";
import type { BlockOf } from "@/content/blocks";
import { fmt, SERIES_COLORS } from "./format";
import { WidgetFrame } from "./WidgetFrame";

const W = 640;
const H = 320;
const M = { l: 56, r: 16, t: 20, b: 48 };

export function Chart({ block }: { block: BlockOf<"chart"> }) {
  const [hover, setHover] = useState<string | null>(null);
  const cats = useMemo(() => [...new Set(block.series.flatMap((s) => s.data.map((d) => String(d.x))))], [block.series]);
  const ys = block.series.flatMap((s) => s.data.map((d) => d.y));
  const y = scaleLinear()
    .domain([Math.min(0, ...ys), Math.max(0, ...ys)])
    .nice()
    .range([H - M.b, M.t]);
  const band = scaleBand().domain(cats).range([M.l, W - M.r]).padding(0.28);
  const inner = scaleBand().domain(block.series.map((_, i) => String(i))).range([0, band.bandwidth()]).padding(0.12);
  const point = scalePoint().domain(cats).range([M.l + 12, W - M.r - 12]);
  const valueAt = (si: number, c: string) => block.series[si].data.find((d) => String(d.x) === c)?.y;
  const labelEvery = Math.ceil(cats.length / 10);

  return (
    <WidgetFrame caption={block.caption} label={block.title ?? "Data"}>
      <div className="px-3 pt-4 sm:px-6">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full select-none" role="img" aria-label={block.title ?? "Chart"} onPointerLeave={() => setHover(null)}>
          {y.ticks(5).map((t) => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--border)" />
              <text x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--muted)">
                {fmt(t)}
              </text>
            </g>
          ))}
          {cats.map((c, i) =>
            i % labelEvery === 0 ? (
              <text key={c} x={(block.kind === "bar" ? band(c)! + band.bandwidth() / 2 : point(c)!)} y={H - M.b + 18} textAnchor="middle" fontSize={12} fill={hover === c ? "var(--text)" : "var(--muted)"}>
                {c.length > 14 ? `${c.slice(0, 13)}…` : c}
              </text>
            ) : null,
          )}
          {block.kind === "bar"
            ? block.series.map((s, si) =>
                s.data.map((d) => {
                  const c = String(d.x);
                  const top = y(Math.max(0, d.y));
                  return (
                    <rect
                      key={`${si}-${c}`}
                      x={band(c)! + inner(String(si))!}
                      y={top}
                      width={inner.bandwidth()}
                      height={Math.max(1, Math.abs(y(d.y) - y(0)))}
                      rx={3}
                      fill={SERIES_COLORS[si % SERIES_COLORS.length]}
                      opacity={hover && hover !== c ? 0.45 : 1}
                      className="transition-opacity"
                      onPointerEnter={() => setHover(c)}
                    />
                  );
                }),
              )
            : block.series.map((s, si) => (
                <g key={si}>
                  <path
                    d={line<{ x: string | number; y: number }>()
                      .x((d) => point(String(d.x))!)
                      .y((d) => y(d.y))(s.data) ?? ""}
                    fill="none"
                    stroke={SERIES_COLORS[si % SERIES_COLORS.length]}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                  />
                  {s.data.map((d) => (
                    <circle key={String(d.x)} cx={point(String(d.x))} cy={y(d.y)} r={hover === String(d.x) ? 5 : 3} fill={SERIES_COLORS[si % SERIES_COLORS.length]} />
                  ))}
                </g>
              ))}
          {block.kind === "line" &&
            cats.map((c) => (
              <rect key={c} x={point(c)! - point.step() / 2} y={M.t} width={point.step() || W} height={H - M.t - M.b} fill="transparent" onPointerEnter={() => setHover(c)} />
            ))}
          <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeOpacity={0.6} />
          {block.yLabel && (
            <text transform={`translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={12.5} fill="var(--muted)">
              {block.yLabel}
            </text>
          )}
          {block.xLabel && (
            <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" fontSize={12.5} fill="var(--muted)">
              {block.xLabel}
            </text>
          )}
        </svg>
        <div className="flex min-h-7 flex-wrap items-center justify-center gap-x-5 gap-y-1 pb-3 text-[12.5px] text-muted">
          {block.series.map((s, si) => (
            <span key={si} className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_COLORS[si % SERIES_COLORS.length] }} />
              {s.name}
              {hover && valueAt(si, hover) !== undefined && <span className="tabular-nums text-text">{fmt(valueAt(si, hover)!)}</span>}
            </span>
          ))}
          {hover && <span className="text-text">· {hover}</span>}
        </div>
      </div>
    </WidgetFrame>
  );
}
