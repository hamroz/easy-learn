import { z } from "zod";

/**
 * Lesson content model (spec §4). Shared by server (validation of AI output) and client (rendering).
 * `md` fields use inline markdown: **bold**, *italic*, `code`, [link](url), $inline math$.
 */

const id = z.string().min(1).max(80);
const md = z.string().min(1);
const caption = z.string().optional();
const svg = z.string().min(1);

export const paragraphBlock = z.object({ type: z.literal("paragraph"), id, md });
export const headingBlock = z.object({ type: z.literal("heading"), id, text: z.string().min(1) });
export const CALLOUT_VARIANTS = ["insight", "analogy", "history", "example", "caution"] as const;
export const calloutBlock = z.object({
  type: z.literal("callout"),
  id,
  variant: z.enum(CALLOUT_VARIANTS).catch("insight"),
  title: z.string().optional(),
  md,
});
export const mathBlock = z.object({ type: z.literal("math"), id, tex: z.string().min(1) });
export const listBlock = z.object({
  type: z.literal("list"),
  id,
  ordered: z.boolean().default(false),
  items: z.array(md).min(1),
});
export const quoteBlock = z.object({ type: z.literal("quote"), id, md, cite: z.string().optional() });
export const codeBlock = z.object({ type: z.literal("code"), id, lang: z.string().optional(), code: z.string().min(1) });

const elementIds = z.array(z.string()).default([]);

export const diagramWidget = z.object({
  type: z.literal("diagram"),
  id,
  svg,
  steps: z.array(z.object({ label: z.string().min(1), md: z.string().optional(), show: elementIds })).optional(),
  caption,
});

export const scrollyWidget = z.object({
  type: z.literal("scrolly"),
  id,
  svg,
  steps: z.array(z.object({ md, show: elementIds })).min(2),
  caption,
});

const identifier = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,15}$/);
const axis = z.object({ label: z.string().optional(), min: z.number(), max: z.number() });
export const CURVE_COLORS = ["accent", "accent2", "muted", "text"] as const;

export const plotWidget = z.object({
  type: z.literal("plot"),
  id,
  title: z.string().optional(),
  x: axis,
  y: axis,
  params: z
    .array(
      z.object({
        name: identifier,
        label: z.string().min(1),
        min: z.number(),
        max: z.number(),
        step: z.number().positive().optional(),
        value: z.number(),
      }),
    )
    .max(4)
    .default([]),
  curves: z
    .array(z.object({ expr: z.string().min(1).max(200), label: z.string().optional(), color: z.enum(CURVE_COLORS).optional() }))
    .min(1)
    .max(4),
  caption,
});

export const chartWidget = z.object({
  type: z.literal("chart"),
  id,
  kind: z.enum(["bar", "line"]).catch("bar"),
  title: z.string().optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  series: z
    .array(
      z.object({
        name: z.string(),
        data: z.array(z.object({ x: z.union([z.string(), z.number()]), y: z.number() })).min(1),
      }),
    )
    .min(1)
    .max(4),
  caption,
});

export const timelineWidget = z.object({
  type: z.literal("timeline"),
  id,
  events: z.array(z.object({ date: z.string().min(1), title: z.string().min(1), md })).min(2),
  caption,
});

export const formulaWidget = z.object({
  type: z.literal("formula"),
  id,
  tex: z.string().min(1),
  parts: z.array(z.object({ id: identifier, label: z.string().min(1), md })).min(1),
  caption,
});

export const compareWidget = z.object({
  type: z.literal("compare"),
  id,
  columns: z
    .array(z.object({ title: z.string().min(1), md, points: z.array(z.string()).optional() }))
    .min(2)
    .max(4),
  caption,
});

export const cardsWidget = z.object({
  type: z.literal("cards"),
  id,
  cards: z.array(z.object({ front: z.string().min(1), back: md })).min(2),
  caption,
});

export const revealWidget = z.object({ type: z.literal("reveal"), id, prompt: md, answer: md, caption });

export const stepsWidget = z.object({
  type: z.literal("steps"),
  id,
  steps: z.array(z.object({ title: z.string().min(1), md, svg: z.string().optional() })).min(2),
  caption,
});

/** Every widget except `custom` — used as the fallback for custom widgets. */
export const libraryWidget = z.discriminatedUnion("type", [
  diagramWidget,
  scrollyWidget,
  plotWidget,
  chartWidget,
  timelineWidget,
  formulaWidget,
  compareWidget,
  cardsWidget,
  revealWidget,
  stepsWidget,
]);

export const customWidget = z.object({
  type: z.literal("custom"),
  id,
  brief: z.string().min(1),
  height: z.number().int().min(200).max(900).default(380),
  fallback: libraryWidget.optional(),
  status: z.enum(["pending", "ready", "failed"]).default("pending"),
  code: z.string().optional(),
  caption,
});

export const blockSchema = z.discriminatedUnion("type", [
  paragraphBlock,
  headingBlock,
  calloutBlock,
  mathBlock,
  listBlock,
  quoteBlock,
  codeBlock,
  diagramWidget,
  scrollyWidget,
  plotWidget,
  chartWidget,
  timelineWidget,
  formulaWidget,
  compareWidget,
  cardsWidget,
  revealWidget,
  stepsWidget,
  customWidget,
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;
export type LibraryWidget = z.infer<typeof libraryWidget>;

export const WIDGET_TYPES = new Set<BlockType>([
  "diagram",
  "scrolly",
  "plot",
  "chart",
  "timeline",
  "formula",
  "compare",
  "cards",
  "reveal",
  "steps",
  "custom",
]);

/** Text blocks whose prose can be selected for ask-about-selection. */
export const TEXT_BLOCK_TYPES = new Set<BlockType>(["paragraph", "callout", "list", "quote"]);

/** Strict schema for one AI section response (used for validation + repair). */
export const sectionBlocksSchema = z.object({ blocks: z.array(blockSchema).min(1) });

/**
 * Keep every valid block, drop invalid ones, and make ids present and unique.
 * Used as the last line of defence after the repair round failed.
 */
export function parseBlocksLenient(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Block[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const candidate = { ...(item as Record<string, unknown>) };
    if (typeof candidate.id !== "string" || !candidate.id) candidate.id = `b${i}`;
    const parsed = blockSchema.safeParse(candidate);
    if (!parsed.success) return;
    let blockId = parsed.data.id;
    for (let n = 2; seen.has(blockId); n++) blockId = `${parsed.data.id}-${n}`;
    seen.add(blockId);
    out.push({ ...parsed.data, id: blockId });
  });
  return out;
}
