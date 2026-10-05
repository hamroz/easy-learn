import { type FormatId, formatInfo } from "@/content/formats";

/** Per-format guidance for planning and writing single-page formats (courses use the defaults). */
const GUIDE: Record<Exclude<FormatId, "course">, { plan: string; writing: (sectionIndex: number) => string }> = {
  explainer: {
    plan: "This is an EXPLAINER: one page that answers one question deeply in 5–10 minutes. Build from a hook to the full answer; at least two sections should have a hands-on widget.",
    writing: () => "Write it like a lesson section: 300–550 words of prose with 1–2 widgets where they help.",
  },
  bite: {
    plan: "This is a QUICK BITE: one idea, about two minutes of reading. The whole bite has exactly ONE widget — name it in one section's \"interactive\" and leave the other section without one.",
    writing: () => "This is a quick bite: 120–300 words in this section, crisp and friendly. Include a widget only if the plan names one for this section, and then exactly one.",
  },
  playground: {
    plan: 'This is a PLAYGROUND: the reader learns by playing. Section 1 MUST have "interactive": "custom: <a large simulation — what the reader sees, the controls they have, what they should notice>". The next section explains what is going on. Optionally a short closing section.',
    writing: (i) =>
      i === 0
        ? 'Write 2–4 short paragraphs that set the scene, then the "custom" simulation block (height 560, with a library fallback), then a "list" titled implicitly as things to try: 3–5 concrete experiments for the reader.'
        : "Explain what the reader just saw happening in the simulation: 250–500 words, with at most one supporting widget.",
  },
  map: {
    plan: 'This is a MAP of a field: the reader explores how its ideas connect. Section 1 MUST have "interactive": "conceptMap: <what the map covers>". An optional section 2 suggests where to start and good paths through the map.',
    writing: (i) =>
      i === 0
        ? "Write one or two short framing paragraphs, then exactly one \"conceptMap\" block with 8–16 nodes covering the field's main ideas, with labelled edges for the most important relationships; then one short paragraph inviting the reader to tap ideas they are curious about."
        : "Suggest two or three paths through the map for different curiosities, as short paragraphs or a list. No widgets.",
  },
  story: {
    plan: "This is a STORY: the topic told as a narrative through people, places and turning points, accurate and well paced like a fine magazine feature. Use timelines, scroll-driven drawings or real quotes where they help.",
    writing: () => "Write 350–700 words of narrative prose — scenes, people, stakes — that still explains the ideas. At most one widget (timeline, scrolly or a real quote).",
  },
  cheatsheet: {
    plan: "This is a CHEAT SHEET: a dense one-page reference of the essentials, grouped by theme. Each section is a group (e.g. key terms, rules of thumb, formulas, common mistakes). No storytelling.",
    writing: () => 'Be dense and scannable: mostly "list", "formula", "compare" and "cards" blocks, with only short framing sentences (no more than ~200 words of prose). Every item must be accurate and self-contained.',
  },
};

export function planGuidance(format: FormatId | undefined): string {
  if (!format || format === "course") return "";
  return GUIDE[format].plan;
}

export function writingGuidance(format: FormatId | undefined, sectionIndex: number): string {
  if (!format || format === "course") return "";
  return GUIDE[format].writing(sectionIndex);
}

export function sectionBounds(format: FormatId | undefined): [number, number] {
  if (!format || format === "course") return [3, 8];
  const [min, max] = formatInfo(format).sections;
  return [min, max];
}
