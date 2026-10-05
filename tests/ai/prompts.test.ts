import { describe, expect, it } from "vitest";
import { WIDGET_TYPES } from "@/content/blocks";
import { buildOutlinePrompt } from "@/server/ai/prompts/outline";
import { buildSectionPrompt } from "@/server/ai/prompts/section";
import { buildLessonPlanPrompt } from "@/server/ai/prompts/lessonPlan";
import { buildAnswerPrompt } from "@/server/ai/prompts/answer";
import { buildQuizPrompt } from "@/server/ai/prompts/quiz";
import { buildWidgetPrompt } from "@/server/ai/prompts/widget";

const course = { title: "Теория относительности", subtitle: null, language: "ru", level: "beginner" as const };
const lesson = { title: "Свет", summary: "Почему свет особенный", position: 0 };
const plan = {
  sections: [
    { heading: "A", goal: "g", keyPoints: [], interactive: "plot" },
    { heading: "B", goal: "g", keyPoints: [], interactive: "custom: a light clock" },
    { heading: "C", goal: "g", keyPoints: [] },
  ],
};

describe("prompts", () => {
  it("outline prompt carries the topic, level and the default enabled fonts", () => {
    const p = buildOutlinePrompt({ topic: "quantum entanglement", level: "beginner" });
    expect(p.prompt).toContain("quantum entanglement");
    expect(p.system).toContain("beginner");
    for (const f of ["literata", "inter", "plex"]) expect(p.system).toContain(f);
  });

  it("section prompt documents every widget type and the course language", () => {
    const p = buildSectionPrompt({ course, lesson, plan, sectionIndex: 0, lessonCount: 5 });
    for (const w of WIDGET_TYPES) expect(p.system).toContain(`"${w}"`);
    expect(p.system).toContain("ru");
    expect(p.system).toMatch(/never include quizzes/i);
  });

  it("section prompt only allows a custom widget where the plan asked for one", () => {
    expect(buildSectionPrompt({ course, lesson, plan, sectionIndex: 0, lessonCount: 5 }).prompt).toMatch(/do not use a "custom" widget/i);
    expect(buildSectionPrompt({ course, lesson, plan, sectionIndex: 1, lessonCount: 5 }).prompt).toContain("a light clock");
  });

  it("lesson plan prompt forbids quizzes and limits custom widgets to one", () => {
    const p = buildLessonPlanPrompt({ course, lesson, lessons: [lesson], previous: null });
    expect(p.system).toMatch(/never include quizzes/i);
    expect(p.system).toMatch(/at most one/i);
  });

  it("answer prompt includes the quote, the question and the conversation so far", () => {
    const p = buildAnswerPrompt({
      course,
      lessonTitle: "Свет",
      sectionText: "context text",
      quote: "скорость света",
      history: [{ role: "user", content: "first?" }, { role: "assistant", content: "first answer" }],
      question: "а почему?",
    });
    expect(p.prompt).toContain("скорость света");
    expect(p.prompt).toContain("а почему?");
    expect(p.prompt).toContain("first answer");
    expect(p.system).toContain("ru");
  });

  it("answer prompt keeps preset button questions in the course language", () => {
    const p = buildAnswerPrompt({ course, lessonTitle: "Свет", sectionText: "t", quote: "q", history: [], question: "Explain this simply" });
    expect(p.system).toMatch(/buttons?.*course language/i);
  });

  it("quiz prompt is the only one that asks for questions", () => {
    expect(buildQuizPrompt({ course, lessonTitle: "Свет", lessonText: "text" }).system).toMatch(/quiz/i);
  });

  it("widget prompt requires the ready handshake and forbids network access", () => {
    const p = buildWidgetPrompt({ course, lessonTitle: "Свет", brief: "a light clock", height: 380 });
    expect(p.system).toContain("postMessage({ type: 'ready' }");
    expect(p.system).toMatch(/no network/i);
  });
});
