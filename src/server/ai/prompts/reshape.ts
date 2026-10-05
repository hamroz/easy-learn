import { AUTHOR, courseContext, type CourseCtx, JSON_ONLY, languageRule, type Prompt } from "./style";

type OutlineItem = { title: string; summary: string };

function list(items: OutlineItem[]) {
  return items.length ? items.map((l, i) => `${i + 1}. ${l.title} — ${l.summary}`).join("\n") : "(none)";
}

/** Rewrite the not-yet-generated part of a course outline following a free-text instruction. */
export function buildReshapePrompt(input: {
  course: CourseCtx;
  fixed: OutlineItem[];
  planned: OutlineItem[];
  instruction: string;
  mode: "reshape" | "steer";
}): Prompt {
  const why =
    input.mode === "steer"
      ? "The learner has finished some lessons and wants to steer where the course goes next."
      : "The learner is reviewing the course outline before starting and wants it changed.";
  const system = `${AUTHOR}

${why} Rewrite ONLY the upcoming lessons (the ones not yet written) so the course follows the learner's instruction, while still flowing naturally from the lessons that already exist. Keep good existing lessons if they still fit. Use 1–10 upcoming lessons.

${languageRule(input.course.language)}

Output JSON shape: {"lessons":[{"title","summary"}…]} — the complete new list of upcoming lessons, in order.

${JSON_ONLY}`;

  const prompt = `${courseContext(input.course)}

Lessons already written (cannot change):
${list(input.fixed)}

Current upcoming lessons:
${list(input.planned)}

Learner's instruction:
"""
${input.instruction}
"""`;
  return { system, prompt };
}
