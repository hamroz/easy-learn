"use client";

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { compile, type EvalFunction } from "mathjs";
import { useMemo, useState } from "react";
import type { BlockOf } from "@/content/blocks";
import { curveColor, fmt } from "./format";
import { WidgetFrame } from "./WidgetFrame";

const W = 640;
const H = 340;
const M = { l: 52, r: 18, t: 18, b: 44 };
const N = 320;

type Pt = { x: number; y: number; ok: boolean };

export function Plot({ block }: { block: BlockOf<"plot"> }) {
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(block.params.map((p) => [p.name, p.value])));
  const [hoverX, setHoverX] = useState<number | null>(null);

  const x = useMemo(() => scaleLinear().domain([block.x.min, block.x.max]).range([M.l, W - M.r]), [block.x.min, block.x.max]);
  const y = useMemo(() => scaleLinear().domain([block.y.min, block.y.max]).range([H - M.b, M.t]), [block.y.min, block.y.max]);

  const compiled = useMemo(
    () =>
      block.curves.map((c) => {
        try {
          return compile(c.expr) as EvalFunction;
        } catch {
          return null;
        }
      }),
    [block.curves],
  );

  const evalAt = (fn: EvalFunction | null, xv: number): number => {
    if (!fn) return NaN;
    try {
      const v = fn.evaluate({ ...values, x: xv });
      return typeof v === "number" ? v : NaN;
    } catch {
      return NaN;
    }
  };

  const span = block.y.max - block.y.min;
  const paths = compiled.map((fn) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const xv = block.x.min + ((block.x.max - block.x.min) * i) / N;
      const yv = evalAt(fn, xv);
      pts.push({ x: xv, y: yv, ok: Number.isFinite(yv) && yv > block.y.min - span && yv < block.y.max + span });
    }
    return (
      line<Pt>()
        .defined((p) => p.ok)
        .x((p) => x(p.x))
        .y((p) => y(p.y))(pts) ?? ""
    );
  });

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHoverX(px < M.l || px > W - M.r ? null : x.invert(px));
  };

  const clipId = `clip-${block.id}`;
  return (
    <WidgetFrame caption={block.caption} label={block.title ?? "Explore"}>
      <div className="px-3 pt-4 sm:px-6">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none select-none" onPointerMove={onMove} onPointerLeave={() => setHoverX(null)} role="img" aria-label={block.title ?? "Interactive plot"}>
          <defs>
            <clipPath id={clipId}>
              <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} />
            </clipPath>
          </defs>
          {y.ticks(5).map((t) => (
            <g key={`y${t}`}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--muted)">
                {fmt(t)}
              </text>
            </g>
          ))}
          {x.ticks(6).map((t) => (
            <text key={`x${t}`} x={x(t)} y={H - M.b + 18} textAnchor="middle" fontSize={12} fill="var(--muted)">
              {fmt(t)}
            </text>
          ))}
          <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="var(--muted)" strokeOpacity={0.5} />
          {block.x.label && (
            <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" fontSize={12.5} fill="var(--muted)">
              {block.x.label}
            </text>
          )}
          {block.y.label && (
            <text transform={`translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={12.5} fill="var(--muted)">
              {block.y.label}
            </text>
          )}
          <g clipPath={`url(#${clipId})`}>
            {paths.map((d, i) => (
              <path key={i} data-curve={i} d={d} fill="none" stroke={curveColor(block.curves[i].color, i)} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {hoverX !== null && (
              <g>
                <line x1={x(hoverX)} x2={x(hoverX)} y1={M.t} y2={H - M.b} stroke="var(--muted)" strokeDasharray="3 4" strokeOpacity={0.6} />
                {compiled.map((fn, i) => {
                  const yv = evalAt(fn, hoverX);
                  return Number.isFinite(yv) ? <circle key={i} cx={x(hoverX)} cy={y(yv)} r={4.5} fill={curveColor(block.curves[i].color, i)} stroke="var(--surface)" strokeWidth={2} /> : null;
                })}
              </g>
            )}
          </g>
        </svg>
        <div className="flex min-h-6 flex-wrap items-center justify-center gap-x-5 gap-y-1 pb-1 text-[12.5px] text-muted">
          {block.curves.map((c, i) => {
            const yv = hoverX !== null ? evalAt(compiled[i], hoverX) : null;
            return (
              <span key={i} className="inline-flex items-center gap-2">
                <span className="h-0.5 w-4 rounded" style={{ background: curveColor(c.color, i) }} />
                {c.label ?? c.expr}
                {yv !== null && <span className="tabular-nums text-text">= {fmt(yv)}</span>}
              </span>
            );
          })}
          {hoverX !== null && <span className="tabular-nums">at {block.x.label ?? "x"} = {fmt(hoverX)}</span>}
        </div>
      </div>
      {block.params.length > 0 && (
        <div className="grid gap-x-8 gap-y-4 border-t border-border px-5 py-5 sm:grid-cols-2 sm:px-8">
          {block.params.map((p) => {
            const step = p.step ?? (p.max - p.min) / 100;
            return (
              <label key={p.name} className="block">
                <span className="flex items-baseline justify-between text-[13px]">
                  <span className="text-text">{p.label}</span>
                  <span className="tabular-nums text-muted">{fmt(values[p.name])}</span>
                </span>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={step}
                  value={values[p.name]}
                  onChange={(e) => setValues({ ...values, [p.name]: Number(e.target.value) })}
                  className="range mt-2 w-full"
                />
              </label>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}
