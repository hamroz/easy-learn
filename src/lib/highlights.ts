/** Paint thread highlights with the CSS Custom Highlight API (no DOM mutation, so React stays in charge). */

type HighlightRegistry = { set(name: string, h: unknown): void; delete(name: string): void };
type HighlightCtor = new (...ranges: Range[]) => unknown;

function registry(): { reg: HighlightRegistry; Ctor: HighlightCtor } | null {
  if (typeof window === "undefined") return null;
  const reg = (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
  const Ctor = (window as unknown as { Highlight?: HighlightCtor }).Highlight;
  return reg && Ctor ? { reg, Ctor } : null;
}

export function paintHighlights(ranges: Range[], active: Range[]) {
  const r = registry();
  if (!r) return;
  r.reg.set("el-thread", new r.Ctor(...ranges));
  r.reg.set("el-thread-active", new r.Ctor(...active));
}

export function clearHighlights() {
  const r = registry();
  r?.reg.delete("el-thread");
  r?.reg.delete("el-thread-active");
}

/** The text position under a screen point. */
export function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const p = d.caretPositionFromPoint?.(x, y);
  if (p) return { node: p.offsetNode, offset: p.offset };
  const r = d.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

/**
 * ::highlight() rules, injected as a plain <style> tag because the build's CSS parser does not
 * understand the pseudo-element and mangles it.
 */
export const HIGHLIGHT_CSS = `
::highlight(el-thread){background-color:color-mix(in oklab,var(--highlight) 70%,transparent);text-decoration:underline;text-decoration-color:color-mix(in oklab,var(--accent) 55%,transparent);text-decoration-thickness:1.5px;text-underline-offset:4px}
::highlight(el-thread-active){background-color:var(--highlight);text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:2px;text-underline-offset:4px}
`;
