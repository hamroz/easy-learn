import { AUTHOR, courseContext, type CourseCtx, JSON_ONLY, languageRule, MARKDOWN_RULES, type Prompt } from "./style";

export function buildVariantPrompt(input: {
  course: CourseCtx;
  lessonTitle: string;
  paragraph: string;
  context: string;
  kind: "simpler" | "deeper";
}): Prompt {
  const how =
    input.kind === "simpler"
      ? "Rewrite the paragraph more simply: everyday words, a concrete example or analogy, shorter sentences. Same meaning, no new jargon. Similar length or a little longer."
      : "Rewrite the paragraph going deeper: more precise, mention the mechanism or mathematics behind it, and one subtlety a curious reader would enjoy. Up to about twice the length.";
  const system = `${AUTHOR}

${how} It replaces the original paragraph in place, so it must read naturally between the surrounding paragraphs.

${MARKDOWN_RULES}
${languageRule(input.course.language)}

Output JSON shape: {"md":"…"}

${JSON_ONLY}`;
  const prompt = `${courseContext(input.course)}
Lesson: "${input.lessonTitle}"

Surrounding text:
"""
${input.context.slice(0, 4000)}
"""

Paragraph to rewrite:
"""
${input.paragraph}
"""`;
  return { system, prompt };
}
