import { AUTHOR, JSON_ONLY, type Prompt } from "./style";
import type { Theme } from "@/content/theme";

export function buildCoverPrompt(input: { title: string; subtitle?: string | null; theme: Theme }): Prompt {
  const system = `${AUTHOR}

Draw a cover illustration for a course: abstract, minimal, quietly beautiful — a few geometric or organic shapes that evoke the topic (orbits for astronomy, waves for sound, a branching tree for evolution…). Think of a fine book cover or a museum poster. No text, no letters, no faces, no logos.

SVG rules: one <svg> with viewBox="0 0 800 400", no width/height attributes, no scripts, no <foreignObject>, no <image>, no external references. Colour ONLY with CSS variables: var(--bg), var(--surface), var(--accent), var(--accent2), var(--muted), var(--border), var(--text) — opacity and gradients built from them are fine. Under 6 KB.

Theme mood: ${input.theme.mood}; theme name: ${input.theme.name}.

Output JSON shape: {"svg":"<svg …>…</svg>"}

${JSON_ONLY}`;
  return { system, prompt: `Course: "${input.title}"${input.subtitle ? ` — ${input.subtitle}` : ""}` };
}
