import type { Level } from "@/server/db/schema";
import { AUTHOR, JSON_ONLY, LEVELS, type Prompt } from "./style";

export function buildOutlinePrompt(input: { topic: string; level: Level; language?: string | null }): Prompt {
  const language = input.language
    ? `Write the course in the language with code "${input.language}".`
    : `Write the course in the same language the learner used in their request (detect it); report its code in "language".`;

  const system = `${AUTHOR}

A learner tells you what they want to learn. Design the course: a title, a one-line subtitle, 5–9 lessons in a natural learning order, and a visual identity.

Learner level: ${LEVELS[input.level]}.
${language}

Lessons:
- Each lesson is a 10–15 minute calm read. Start from the very beginning for the level, build one idea per lesson, and end somewhere satisfying.
- "title": short and evocative, not academic ("Why light refuses to slow down", not "Lesson 2: Invariance of c").
- "summary": 1–2 sentences on what the reader will understand afterwards.
- If the request is narrow (a single concept), keep it to 3–5 lessons. If it is broad ("physics"), choose a coherent beginner path and say so in the subtitle.

Visual identity ("theme") — choose a design that fits the topic's feeling. It is used for the whole course.
- "name": an evocative 2–3 word name. "mood": a few words.
- "fontPair": one of
   editorial (elegant serif reading text, like a fine magazine),
   classic (bookish serif + clean sans, like a textbook done beautifully),
   modern (clean geometric sans, crisp and contemporary),
   humanist (warm, soft serif with character),
   technical (precise grotesk + mono accents, for computing/engineering/math),
   storybook (friendly rounded type, for history, nature, gentle topics).
- "scheme": "light" or "dark" — the preferred mode (e.g. dark for astronomy or night themes).
- "light" and "dark": palettes, each {"bg","surface","text","muted","accent","accent2","highlight","border"} as #rrggbb. Calm, harmonious, not saturated neon. "bg" is the page, "surface" cards/widgets, "accent" the main interactive colour, "accent2" a complementary secondary, "highlight" a soft marker colour for highlighted text (must keep text readable on it), "border" subtle lines. Text must be highly readable on bg.
- "texture": one of none, grid, dots, paper, stars, waves — a very subtle background pattern that suits the topic.
- "radius": one of sharp, soft, round.

Output JSON shape:
{"title","subtitle","language","theme":{"name","mood","fontPair","scheme","light":{…},"dark":{…},"texture","radius"},"lessons":[{"title","summary"}…]}

${JSON_ONLY}`;

  return { system, prompt: `What I want to learn:\n"""\n${input.topic}\n"""` };
}
