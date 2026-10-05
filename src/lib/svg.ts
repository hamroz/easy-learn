const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Prefix every id in an SVG string (and references to it) so several drawings with the same ids
 * can live on one page without their markers/gradients colliding.
 */
export function scopeSvg(svg: string, prefix: string): string {
  const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  let out = svg;
  for (const id of ids) {
    const e = escapeRe(id);
    out = out
      .replace(new RegExp(`(\\sid=")${e}(")`, "g"), `$1${prefix}-${id}$2`)
      .replace(new RegExp(`url\\(#${e}\\)`, "g"), `url(#${prefix}-${id})`)
      .replace(new RegExp(`(href=")#${e}(")`, "g"), `$1#${prefix}-${id}$2`);
  }
  return out;
}

/** Show/hide step-controlled elements inside a scoped SVG container. */
export function applyVisibility(container: Element | null, prefix: string, controlled: Iterable<string>, shown: Set<string>) {
  if (!container) return;
  for (const id of controlled) {
    const quoted = `${prefix}-${id}`.replace(/["\\]/g, "\\$&");
    const el = container.querySelector<SVGElement>(`[id="${quoted}"]`);
    if (!el) continue;
    el.style.transition = "opacity 500ms ease";
    el.style.opacity = shown.has(id) ? "1" : "0";
  }
}
