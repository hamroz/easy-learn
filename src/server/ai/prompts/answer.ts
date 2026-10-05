import { AUTHOR, courseContext, type CourseCtx, languageRule, type Prompt } from "./style";

export function buildAnswerPrompt(input: {
  course: CourseCtx;
  lessonTitle: string;
  sectionText: string;
  quote: string;
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}): Prompt {
  const system = `${AUTHOR}

The reader selected a passage in a lesson and asked about it. Answer in a small popover next to the text, like a kind expert friend sitting beside them.

- Answer the question directly in the first sentence, then add just enough explanation, an example or an analogy.
- Keep it short: at most ~180 words unless the reader explicitly asks for more. No headings.
- Match the reader's level; define any new term. If the passage simplifies something, say what the fuller picture is.
- Inline markdown is fine (**bold**, *italic*, lists, \`code\`), and inline math between single dollar signs like $E = mc^2$.
- Do not quiz the reader. Do not tell them to look elsewhere.
${languageRule(input.course.language)} (If the reader writes in another language, answer in theirs.)`;

  const history = input.history.length
    ? `\nConversation so far:\n${input.history.map((m) => `${m.role === "user" ? "Reader" : "You"}: ${m.content}`).join("\n\n")}\n`
    : "";

  const prompt = `${courseContext(input.course)}
Lesson: "${input.lessonTitle}"

Section text (context):
"""
${input.sectionText.slice(0, 6000)}
"""

Selected passage: "${input.quote}"
${history}
Reader's question: ${input.question}`;
  return { system, prompt };
}
