import { describe, expect, it } from "vitest";
import { MockProvider } from "@/server/ai/mock";
import { extractJson } from "@/server/ai/json";
import { sectionBlocksSchema, WIDGET_TYPES } from "@/content/blocks";
import { coverSchema, lessonPlanSchema, lessonsListSchema, outlineSchema, quizSchema, variantSchema, widgetCodeSchema } from "@/content/outline";

const mock = new MockProvider({ delayMs: 0 });
const ask = (task: Parameters<MockProvider["complete"]>[0]["task"], meta = {}) =>
  mock.complete({ task, system: "", prompt: "", meta }).then(extractJson);

describe("MockProvider", () => {
  it("produces schema-valid output for every structured task", async () => {
    expect(outlineSchema.safeParse(await ask("outline", { topic: "Relativity" })).success).toBe(true);
    expect(lessonsListSchema.safeParse(await ask("reshape")).success).toBe(true);
    expect(lessonsListSchema.safeParse(await ask("steer")).success).toBe(true);
    expect(lessonPlanSchema.safeParse(await ask("lesson_plan")).success).toBe(true);
    expect(quizSchema.safeParse(await ask("quiz")).success).toBe(true);
    expect(variantSchema.safeParse(await ask("variant")).success).toBe(true);
    expect(coverSchema.safeParse(await ask("cover")).success).toBe(true);
    expect(widgetCodeSchema.safeParse(await ask("widget")).success).toBe(true);
  });

  it("covers every widget type across the four mock sections", async () => {
    const types = new Set<string>();
    for (let position = 0; position < 4; position++) {
      const parsed = sectionBlocksSchema.parse(await ask("section", { position }));
      parsed.blocks.forEach((b) => types.add(b.type));
    }
    for (const w of WIDGET_TYPES) expect(types.has(w), w).toBe(true);
  });

  it("streams answers word by word", async () => {
    const deltas: string[] = [];
    const text = await mock.complete({ task: "answer", system: "", prompt: "", meta: { quote: "time dilation" }, onDelta: (d) => deltas.push(d) });
    expect(deltas.length).toBeGreaterThan(3);
    expect(deltas.join("")).toBe(text);
    expect(text).toContain("time dilation");
  });
});
