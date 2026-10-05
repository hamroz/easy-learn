import DOMPurify from "isomorphic-dompurify";
import type { Block } from "@/content/blocks";

/** Any url(...) that is not a same-document reference like url(#gradient). */
const EXTERNAL_URL = /url\(\s*(?!['"]?#)/i;

let hooked = false;
function ensureHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (EXTERNAL_URL.test(data.attrValue)) data.keepAttr = false;
  });
}

/**
 * Sanitize AI-generated SVG: no scripts, handlers, foreign content, <style> (it would restyle the whole
 * page once inlined) or external url() references.
 */
export function sanitizeSvg(svg: string): string {
  if (!/<svg[\s>]/i.test(svg)) return "";
  ensureHooks();
  const clean = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["foreignObject", "image", "script", "style", "a", "use", "animate", "set", "animateMotion", "animateTransform"],
    FORBID_ATTR: ["href", "xlink:href"],
  });
  return /<svg[\s>]/i.test(clean) ? clean : "";
}

/** Apply sanitizeSvg to every SVG-bearing field in a block list. */
export function sanitizeBlocks(blocks: Block[]): Block[] {
  return blocks.map((b) => sanitizeBlock(b));
}

function sanitizeBlock<B extends Block>(b: B): B {
  switch (b.type) {
    case "diagram":
    case "scrolly":
      return { ...b, svg: sanitizeSvg(b.svg) };
    case "steps":
      return { ...b, steps: b.steps.map((s) => (s.svg ? { ...s, svg: sanitizeSvg(s.svg) } : s)) };
    case "custom":
      return b.fallback ? { ...b, fallback: sanitizeBlock(b.fallback) } : b;
    default:
      return b;
  }
}
