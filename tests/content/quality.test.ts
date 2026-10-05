import { describe, expect, it } from "vitest";
import { plotIssues, sectionQualitySchema } from "@/server/content/quality";
import { blockSchema, type BlockOf } from "@/content/blocks";

const plot = (over: Partial<BlockOf<"plot">>) =>
  blockSchema.parse({
    type: "plot",
    id: "w1",
    x: { min: 0, max: 0.9 },
    y: { min: 0, max: 8 },
    params: [{ name: "k", label: "k", min: 0.5, max: 2, value: 1 }],
    curves: [{ expr: "k/sqrt(1-x^2)" }],
    ...over,
  }) as BlockOf<"plot">;

describe("plotIssues", () => {
  it("accepts a good plot", () => {
    expect(plotIssues(plot({}))).toEqual([]);
  });

  it("flags curves that ignore x", () => {
    const issues = plotIssues(plot({ params: [{ name: "v", label: "v", min: 0, max: 1, value: 0.3 }], curves: [{ expr: "1+v" }, { expr: "1" }] }));
    expect(issues.join(" ")).toMatch(/x/);
  });

  it("flags a parameter named x and parameters no curve uses", () => {
    expect(plotIssues(plot({ params: [{ name: "x", label: "x", min: 0, max: 1, value: 0 }] })).join(" ")).toMatch(/named "x"/);
    expect(plotIssues(plot({ params: [{ name: "z", label: "z", min: 0, max: 1, value: 0 }] })).join(" ")).toMatch(/"z".*not used/);
  });

  it("flags expressions that do not parse or stay outside the y range", () => {
    expect(plotIssues(plot({ curves: [{ expr: "sin(" }] })).join(" ")).toMatch(/parse/);
    expect(plotIssues(plot({ curves: [{ expr: "100 + k*x" }] })).join(" ")).toMatch(/y range/);
  });
});

describe("sectionQualitySchema", () => {
  it("reports plot problems as validation issues so the repair round can fix them", () => {
    const bad = { blocks: [{ type: "paragraph", id: "p", md: "x" }, { type: "plot", id: "w", x: { min: 0, max: 1 }, y: { min: 0, max: 2 }, curves: [{ expr: "1" }] }] };
    const r = sectionQualitySchema.safeParse(bad);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["blocks", 1]);
  });
});
