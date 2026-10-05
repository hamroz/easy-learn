import { AUTHOR, courseContext, type CourseCtx, JSON_ONLY, languageRule, type Prompt } from "./style";

/** The only prompt that produces questions — used solely when the reader clicks "Quiz me". */
export function buildQuizPrompt(input: { course: CourseCtx; lessonTitle: string; lessonText: string }): Prompt {
  const system = `${AUTHOR}

The reader finished a lesson and asked for a short, friendly quiz to check their understanding. Write 5 multiple-choice questions about the lesson's key ideas (understanding, not trivia or memorised numbers). Each has 3–4 plausible options, exactly one correct ("answer" is its zero-based index), and an encouraging one or two sentence "explanation" of why. Vary the position of the correct answer.

Inline markdown and $inline math$ are allowed in questions, options and explanations.
${languageRule(input.course.language)}

Output JSON shape: {"questions":[{"q","options":[…],"answer","explanation"}…]}

${JSON_ONLY}`;
  return { system, prompt: `${courseContext(input.course)}\nLesson: "${input.lessonTitle}"\n\nLesson text:\n"""\n${input.lessonText.slice(0, 16000)}\n"""` };
}
