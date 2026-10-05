import type { LessonPlan } from "@/content/outline";
import type { FormatId } from "@/content/formats";
import { writingGuidance } from "./formats";
import {
  AUTHOR,
  BLOCK_CATALOGUE,
  courseContext,
  type CourseCtx,
  JSON_ONLY,
  languageRule,
  type LessonCtx,
  MARKDOWN_RULES,
  type Prompt,
  SVG_RULES,
  WRITING_STYLE,
} from "./style";

export function buildSectionPrompt(input: {
  course: CourseCtx;
  lesson: LessonCtx;
  plan: LessonPlan;
  sectionIndex: number;
  lessonCount: number;
  format?: FormatId;
}): Prompt {
  const formatNote = writingGuidance(input.format, input.sectionIndex);
  const single = !!formatNote;
  /** Formats whose widget budget is fixed by the plan: an unplanned section gets no widget. */
  const plannedWidgetsOnly = input.format === "bite" || input.format === "map";
  const section = input.plan.sections[input.sectionIndex];
  const interactive = section.interactive?.trim();
  const customIdea = interactive?.toLowerCase().startsWith("custom") ? interactive.replace(/^custom\s*:?\s*/i, "") : null;

  const system = `${AUTHOR}

Write ONE section of a lesson as a list of content blocks. Other sections are written separately, so do not repeat their content and do not write the lesson title. The section's heading is shown above your blocks — do not repeat it.

${single ? formatNote : "Length: about 300–650 words of prose, in 4–10 paragraphs, plus 1–2 widgets placed exactly where they help (usually right after the paragraph that sets them up, followed by a paragraph that reflects on what the reader saw)."} A widget must let the reader *do* something that builds intuition; never add decoration.

${WRITING_STYLE}
${languageRule(input.course.language)}

${MARKDOWN_RULES}

${BLOCK_CATALOGUE}

${SVG_RULES}

Output JSON shape: {"blocks":[…]} — ids unique within the section; prefix them with "s${input.sectionIndex}" (e.g. "s${input.sectionIndex}p1", "s${input.sectionIndex}w1").

${JSON_ONLY}`;

  const mapIdea = interactive?.toLowerCase().startsWith("conceptmap") ? interactive.replace(/^conceptmap\s*:?\s*/i, "") : null;
  const customRule = mapIdea
    ? `Include exactly one "conceptMap" block covering: ${mapIdea}. Do not use a "custom" widget.`
    : customIdea
    ? `You may use ONE "custom" widget for: ${customIdea}. Write a precise "brief" and include a "fallback" library widget.`
    : `Do not use a "custom" widget in this section; use the library widgets.`;

  const prompt = `${courseContext(input.course)}
Lesson ${input.lesson.position + 1} of ${input.lessonCount}: "${input.lesson.title}" — ${input.lesson.summary}

Lesson plan:
${input.plan.sections
  .map((s, i) => `${i === input.sectionIndex ? "→" : " "} ${i + 1}. ${s.heading} — ${s.goal}`)
  .join("\n")}

Write section ${input.sectionIndex + 1}: "${section.heading}"
Goal: ${section.goal}
Key points: ${section.keyPoints.length ? section.keyPoints.join("; ") : "(your choice)"}
Interactive idea: ${interactive ?? (plannedWidgetsOnly ? "none — no widget in this section" : "(your choice — or none if prose is better)")}
${customRule}
${input.sectionIndex === 0 ? "This is the first section: open with a situation or question that makes the reader curious." : ""}
${input.sectionIndex === input.plan.sections.length - 1 ? single ? "This is the last section: close the page calmly." : "This is the last section: close the lesson calmly and hint at what comes next." : ""}`;
  return { system, prompt };
}
