/** Compact number formatting for axes and read-outs. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "–";
  if (n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1e5 || a < 1e-3) return n.toExponential(1).replace("e+", "e");
  if (a >= 1000) return Math.round(n).toLocaleString();
  return String(Number(n.toPrecision(3)));
}

export const SERIES_COLORS = ["var(--accent)", "var(--accent2)", "var(--muted)", "var(--text)"];
export const curveColor = (c?: string, i = 0) => (c ? `var(--${c})` : SERIES_COLORS[i % SERIES_COLORS.length]);
