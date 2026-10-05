import type { Level } from "@/server/db/schema";

export type CourseCtx = { title: string; subtitle?: string | null; language: string; level: Level };
export type LessonCtx = { title: string; summary: string; position: number };
export type Prompt = { system: string; prompt: string };

export const AUTHOR = `You are the author behind Easy Learn, a calm place where curious adults learn anything through beautiful, interactive long-form lessons — in the spirit of Bartosz Ciechanowski's explorable essays, 3Blue1Brown and the best popular-science writing.`;

export const LEVELS: Record<Level, string> = {
  beginner: "beginner — assume no background; build every idea from everyday experience before any formalism",
  intermediate: "intermediate — assume general familiarity; move faster through basics and go further",
  advanced: "advanced — assume solid background; be precise and rigorous, still clear and warm",
};

export const WRITING_STYLE = `Writing style:
- Calm, warm, unhurried. Intuition first: concrete situations, examples and analogies before definitions and formulas.
- Define every technical term the first time it appears, in plain words.
- Short paragraphs (2–4 sentences), one idea each. Prefer the active voice and the second person ("you").
- Honest about subtleties and simplifications ("this is a simplification; the full story is…").
- No hype, no exclamation marks, no filler ("In this section we will…"), no condescension.
- The reader is never tested. Never include quizzes, exercises with grades or "check your understanding" questions. A gentle "pause and think" moment (the "reveal" widget) is fine occasionally.`;

export function languageRule(language: string) {
  return `Language: write every human-readable string in the language with code "${language}" (including widget labels, captions and axis titles). Keep math notation standard.`;
}

export function courseContext(course: CourseCtx) {
  return `Course: "${course.title}"${course.subtitle ? ` — ${course.subtitle}` : ""}\nLevel: ${LEVELS[course.level]}\nLanguage code: ${course.language}`;
}

export const JSON_ONLY = `Reply with a single JSON object and nothing else — no markdown fences, no commentary.`;

export const MARKDOWN_RULES = `Text fields named "md" use inline markdown only: **bold**, *italic*, \`code\`, [link](https://…), and inline math between single dollar signs like $E = mc^2$ (KaTeX syntax; escape backslashes for JSON, e.g. "$\\\\gamma$"). No headings, no images, no HTML.`;

export const SVG_RULES = `SVG rules (for "svg" fields):
- One <svg> element with a viewBox (e.g. "0 0 640 360"); no width/height attributes; no <script>, <foreignObject>, <image>, external references or event handlers.
- Colour ONLY with these CSS variables so the drawing follows the course theme and dark mode: var(--text), var(--muted), var(--accent), var(--accent2), var(--surface), var(--bg), var(--border), var(--highlight). E.g. fill="var(--accent)".
- Text: <text> with font-size ≥ 14 (in viewBox units), fill="var(--text)" or var(--muted). Keep labels short.
- Give elements that steps refer to a unique id (or wrap groups in <g id="…">).
- Clean, minimal, diagrammatic: generous whitespace, 2–3px strokes, rounded joins. No clutter.`;

/** The block catalogue the section author picks from. Keep in sync with src/content/blocks.ts. */
export const BLOCK_CATALOGUE = `Blocks (each has a unique "id" string, short and stable like "p1", "w2"):

Text:
- {"type":"paragraph","id","md"} — the backbone. Most of the section is paragraphs.
- {"type":"heading","id","text"} — an optional sub-heading inside a long section.
- {"type":"callout","id","variant":"insight"|"analogy"|"history"|"example"|"caution","title"?,"md"} — a highlighted aside.
- {"type":"math","id","tex"} — a display equation (KaTeX). Always explain it in prose around it.
- {"type":"list","id","ordered":boolean,"items":[md,…]}
- {"type":"quote","id","md","cite"?} — only real, accurately attributed quotes.
- {"type":"code","id","lang"?,"code"} — only for programming topics.

Widgets (interactive; each may have an optional "caption" telling the reader what to try):
- {"type":"diagram","id","svg","steps"?:[{"label","md"?,"show":[element ids]}]} — an illustration; with steps the reader clicks through stages, and only elements listed in the current step's "show" (plus elements not mentioned in any step) are visible.
- {"type":"scrolly","id","svg","steps":[{"md","show":[ids]}…≥2]} — a sticky illustration beside text steps; as the reader scrolls each step, the drawing shows that step's elements. Best for processes that unfold.
- {"type":"plot","id","title"?,"x":{"label"?,"min","max"},"y":{"label"?,"min","max"},"params":[{"name","label","min","max","step"?,"value"}…≤4],"curves":[{"expr","label"?,"color"?:"accent"|"accent2"|"muted"|"text"}…≤4]} — live function plot; sliders change params. "expr" is a math.js expression in x and the param names (e.g. "A*sin(k*x)", "1/sqrt(1-x^2)"). Param names are simple identifiers. Make sure y range fits the curves.
- {"type":"chart","id","kind":"bar"|"line","title"?,"xLabel"?,"yLabel"?,"series":[{"name","data":[{"x","y"}…]}…≤4]} — real data only; never invent numbers.
- {"type":"timeline","id","events":[{"date","title","md"}…≥2]} — historical sequence.
- {"type":"formula","id","tex","parts":[{"id","label","md"}…]} — a formula whose parts explain themselves on hover. Wrap each part in the tex with \\\\htmlClass{<part id>}{…}, e.g. "\\\\htmlClass{p1}{E} = \\\\htmlClass{p2}{m}\\\\htmlClass{p3}{c^2}". Part ids are simple identifiers like p1.
- {"type":"compare","id","columns":[{"title","md","points"?:[…]}…2–4]} — contrast ideas side by side.
- {"type":"cards","id","cards":[{"front","back"}…≥2]} — concept cards that flip to reveal an explanation (not a test).
- {"type":"reveal","id","prompt","answer"} — "pause and think" with a gentle reveal. Use sparingly.
- {"type":"steps","id","steps":[{"title","md","svg"?}…≥2]} — a step-through sequence with Prev/Next.
- {"type":"custom","id","brief","height"?:200–900,"fallback":<one library widget above>} — a bespoke simulation written separately from your "brief". Only when explicitly allowed below. The brief must describe exactly what the reader sees and can manipulate. Always include a meaningful library-widget fallback.`;
