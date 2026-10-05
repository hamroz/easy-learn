import { AUTHOR, courseContext, type CourseCtx, JSON_ONLY, languageRule, type LessonCtx, type Prompt, WRITING_STYLE } from "./style";

export function buildLessonPlanPrompt(input: {
  course: CourseCtx;
  lesson: LessonCtx;
  lessons: LessonCtx[];
  /** Short recap of the previous lesson's plan, for continuity. */
  previous: string | null;
}): Prompt {
  const system = `${AUTHOR}

Plan one lesson of the course as 4–6 sections (3 minimum, 8 maximum). The whole lesson is a 10–15 minute calm, long-form read with interactive widgets woven into the prose.

For each section give:
- "heading": short and inviting.
- "goal": what the reader should understand or feel by the end of the section.
- "keyPoints": 2–5 concrete points, examples or analogies to cover.
- "interactive": the best interactive idea for this section, naming a widget type and what the reader does with it — e.g. "plot: drag speed and watch γ shoot up near c". Omit it when prose alone is better.
  Widget types: diagram (labelled illustration, optionally stepped), scrolly (drawing that changes as you scroll), plot (curves with sliders — use for anything the reader should "adjust" and see change), chart (real data), timeline, formula (explains each symbol of an equation; it has no sliders), compare, cards, reveal (pause and think), steps (a sequence).
  Every lesson needs at least one genuinely hands-on moment where the reader manipulates something. When the lesson's central idea involves motion, a physical or biological process, a mechanism or an algorithm, make that moment a bespoke simulation: "custom: <what the reader sees, what they control (sliders, buttons, dragging) and what they should notice>" — e.g. "custom: a light clock on a moving train; a speed slider stretches the photon's zig-zag path while two tick counters drift apart". At most one custom simulation per lesson; use library widgets elsewhere.

Build intuition before formalism; open with a question or a situation, end with a sense of where the next lesson goes.
${WRITING_STYLE}
${languageRule(input.course.language)}

Output JSON shape: {"sections":[{"heading","goal","keyPoints":[…],"interactive"?}…]}

${JSON_ONLY}`;

  const prompt = `${courseContext(input.course)}

Course outline:
${input.lessons.map((l) => `${l.position + 1}. ${l.title} — ${l.summary}`).join("\n")}

Plan lesson ${input.lesson.position + 1}: "${input.lesson.title}" — ${input.lesson.summary}
${input.previous ? `\nThe previous lesson covered:\n${input.previous}` : "\nThis is the first lesson: welcome the reader gently."}`;
  return { system, prompt };
}
