import { describe, expect, it } from "vitest";
import { buildSectionPrompt } from "@/server/ai/prompts/section";
import { buildLessonPlanPrompt } from "@/server/ai/prompts/lessonPlan";

const course = { title: "Atoms", language: "en", level: "beginner" as const };
const lesson = { title: "Atoms", summary: "s", position: 0 };
const plan = { sections: [{ heading: "A", goal: "g", keyPoints: [], interactive: "plot: x" }, { heading: "B", goal: "g", keyPoints: [] }] };

describe("single-page prompts do not contradict their format", () => {
  it("a quick bite section never gets the course length rule, and an unplanned section gets no widget", () => {
    const p = buildSectionPrompt({ course, lesson, plan, sectionIndex: 1, lessonCount: 1, format: "bite" });
    const all = p.system + p.prompt;
    expect(all).not.toMatch(/300–650 words/);
    expect(all).not.toMatch(/1–2 widgets/);
    expect(p.prompt).toMatch(/no widget in this section/i);
  });
  it("courses keep the original rules", () => {
    const p = buildSectionPrompt({ course, lesson, plan, sectionIndex: 1, lessonCount: 5 });
    expect(p.system).toMatch(/300–650 words/);
    expect(p.prompt).toMatch(/your choice/);
  });
  it("plans for cheat sheets and maps do not demand a hands-on simulation", () => {
    for (const format of ["cheatsheet", "map", "bite"] as const) {
      const p = buildLessonPlanPrompt({ course, lesson, lessons: [lesson], previous: null, format });
      expect(p.system, format).not.toMatch(/hands-on moment/);
    }
    expect(buildLessonPlanPrompt({ course, lesson, lessons: [lesson], previous: null }).system).toMatch(/hands-on moment/);
  });
});
