/**
 * Text anchoring for ask-about-selection. Offsets index into a block's visible text: every text node
 * except KaTeX's hidden MathML copy (so formulas count once, as rendered).
 */

export type Anchor = { start: number; end: number; quote: string; prefix: string; suffix: string };

const CONTEXT = 32;

function acceptNode(node: Node) {
  return (node.parentElement?.closest(".katex-mathml") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) as number;
}

function textNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode });
  const out: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return out;
}

export function selectableText(root: Node): string {
  return textNodes(root)
    .map((t) => t.data)
    .join("");
}

/** Character offset of a DOM boundary point within root's selectable text. */
function pointToOffset(root: Node, container: Node, offset: number): number {
  const pre = document.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(container, offset);
  let total = 0;
  for (const t of textNodes(root)) {
    if (t === container) return total + offset;
    if (pre.comparePoint(t, t.length) === 1) break; // this node ends after the boundary
    total += t.length;
  }
  return total;
}

export function textOffsetsFromRange(root: Node, range: Range): { start: number; end: number } | null {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const start = pointToOffset(root, range.startContainer, range.startOffset);
  const end = pointToOffset(root, range.endContainer, range.endOffset);
  return end > start ? { start, end } : null;
}

export function rangeFromOffsets(root: Node, start: number, end: number): Range | null {
  const range = document.createRange();
  let pos = 0;
  let startSet = false;
  for (const t of textNodes(root)) {
    const next = pos + t.length;
    if (!startSet && start < next) {
      range.setStart(t, start - pos);
      startSet = true;
    }
    if (startSet && end <= next) {
      range.setEnd(t, end - pos);
      return range;
    }
    pos = next;
  }
  return null;
}

const WORD = /[\p{L}\p{N}\p{M}'’_-]/u;

/** Trim surrounding whitespace, then grow both ends to whole words. */
export function snapToWords(text: string, start: number, end: number) {
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  while (start > 0 && WORD.test(text[start - 1]) && WORD.test(text[start])) start--;
  while (end < text.length && WORD.test(text[end]) && WORD.test(text[end - 1])) end++;
  return { start, end };
}

export function buildAnchor(root: Node, range: Range): Anchor | null {
  const raw = textOffsetsFromRange(root, range);
  if (!raw) return null;
  const text = selectableText(root);
  // Inline formulas are atomic: a boundary inside one moves to its edge.
  for (const el of (root as Element).querySelectorAll?.(".math-inline") ?? []) {
    const s = pointToOffset(root, el, 0);
    const e = s + selectableText(el).length;
    if (raw.start > s && raw.start < e) raw.start = s;
    if (raw.end > s && raw.end < e) raw.end = e;
  }
  const off = snapToWords(text, raw.start, raw.end);
  if (off.end <= off.start) return null;
  return {
    ...off,
    quote: text.slice(off.start, off.end),
    prefix: text.slice(Math.max(0, off.start - CONTEXT), off.start),
    suffix: text.slice(off.end, off.end + CONTEXT),
  };
}

/** Locate an anchor in (possibly changed) text: exact offsets → prefix+quote+suffix → nearest quote. */
export function reanchor(text: string, a: Anchor): { start: number; end: number } | null {
  if (text.slice(a.start, a.end) === a.quote) return { start: a.start, end: a.end };
  const ctx = text.indexOf(a.prefix + a.quote + a.suffix);
  if (ctx >= 0 && (a.prefix || a.suffix)) {
    const start = ctx + a.prefix.length;
    return { start, end: start + a.quote.length };
  }
  let best = -1;
  for (let i = text.indexOf(a.quote); i >= 0; i = text.indexOf(a.quote, i + 1)) {
    if (best < 0 || Math.abs(i - a.start) < Math.abs(best - a.start)) best = i;
  }
  return best >= 0 ? { start: best, end: best + a.quote.length } : null;
}
