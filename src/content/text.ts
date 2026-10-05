import type { Block } from "./blocks";

/** Rough plain text of inline markdown (for prompts and context, not display). */
export function mdToText(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .trim();
}

/** Plain text of a block, used as AI context. Widgets contribute their captions/labels. */
export function blockText(b: Block): string {
  switch (b.type) {
    case "paragraph":
    case "quote":
      return mdToText(b.md);
    case "callout":
      return [b.title, mdToText(b.md)].filter(Boolean).join(": ");
    case "heading":
      return b.text;
    case "list":
      return b.items.map((i) => `- ${mdToText(i)}`).join("\n");
    case "math":
      return `$$${b.tex}$$`;
    case "code":
      return b.code;
    case "timeline":
      return b.events.map((e) => `${e.date}: ${e.title}. ${mdToText(e.md)}`).join("\n");
    case "compare":
      return b.columns.map((c) => `${c.title}: ${mdToText(c.md)}`).join("\n");
    case "cards":
      return b.cards.map((c) => `${c.front}: ${mdToText(c.back)}`).join("\n");
    case "reveal":
      return `${mdToText(b.prompt)} — ${mdToText(b.answer)}`;
    case "steps":
      return b.steps.map((s) => `${s.title}: ${mdToText(s.md)}`).join("\n");
    case "scrolly":
      return b.steps.map((s) => mdToText(s.md)).join("\n");
    case "formula":
      return `$$${b.tex}$$ ` + b.parts.map((p) => `${p.label}: ${mdToText(p.md)}`).join("; ");
    default:
      return "caption" in b && b.caption ? `[${b.caption}]` : "";
  }
}

export function sectionText(heading: string, blocks: Block[]): string {
  return [`## ${heading}`, ...blocks.map(blockText).filter(Boolean)].join("\n\n");
}
