import { describe, expect, it } from "vitest";
import { lessonPlanSchema, lessonPlanSchemaFor, outlineSchema, quizSchema } from "@/content/outline";

const lessons = (n: number) => Array.from({ length: n }, (_, i) => ({ title: `L${i}`, summary: "s" }));

describe("outlineSchema", () => {
  it("accepts 3–12 lessons and a lenient theme", () => {
    const o = outlineSchema.parse({ title: "Relativity", subtitle: "Space and time", language: "en", theme: { fontPair: "nope" }, lessons: lessons(6) });
    expect(o.lessons).toHaveLength(6);
    expect(o.theme.fontPair).toBe("literata");
  });
  it("rejects outlines with too few lessons", () => {
    expect(outlineSchema.safeParse({ title: "x", language: "en", lessons: lessons(2) }).success).toBe(false);
  });
});

describe("lessonPlanSchema", () => {
  it("course plans require 3–8 sections; single formats use their own bounds", () => {
    const sections = Array.from({ length: 4 }, (_, i) => ({ heading: `S${i}`, goal: "g", keyPoints: ["k"] }));
    expect(lessonPlanSchema.parse({ sections }).sections).toHaveLength(4);
    expect(lessonPlanSchemaFor([3, 8]).safeParse({ sections: sections.slice(0, 2) }).success).toBe(false);
    expect(lessonPlanSchemaFor([1, 2]).safeParse({ sections: sections.slice(0, 1) }).success).toBe(true);
    expect(lessonPlanSchemaFor([1, 2]).safeParse({ sections }).success).toBe(false);
  });
});

describe("quizSchema", () => {
  it("rejects answers outside the options", () => {
    const q = { q: "?", options: ["a", "b"], answer: 2, explanation: "e" };
    expect(quizSchema.safeParse({ questions: [q, q, q] }).success).toBe(false);
    expect(quizSchema.safeParse({ questions: [{ ...q, answer: 1 }, { ...q, answer: 0 }, { ...q, answer: 1 }] }).success).toBe(true);
  });
});
