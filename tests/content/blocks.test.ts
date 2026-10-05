import { describe, expect, it } from "vitest";
import { blockSchema, parseBlocksLenient, WIDGET_TYPES } from "@/content/blocks";
import { everyBlock } from "../fixtures/blocks";


describe("blockSchema", () => {
  it("parses every block type in the spec", () => {
    for (const b of everyBlock) expect(blockSchema.safeParse(b).success, b.type).toBe(true);
  });

  it("knows all 11 widget types", () => {
    expect([...WIDGET_TYPES].sort()).toEqual(
      ["cards", "chart", "compare", "custom", "diagram", "formula", "plot", "reveal", "scrolly", "steps", "timeline"].sort(),
    );
  });

  it("rejects unknown block types", () => {
    expect(blockSchema.safeParse({ type: "hologram", id: "x" }).success).toBe(false);
  });

  it("defaults custom widgets to pending with a height", () => {
    const parsed = blockSchema.parse(everyBlock.at(-1));
    expect(parsed).toMatchObject({ status: "pending", height: 380 });
  });

  it("rejects plot params that are not identifiers", () => {
    const bad = { ...everyBlock[9], params: [{ name: "x; alert(1)", label: "k", min: 0, max: 1, value: 0 }] };
    expect(blockSchema.safeParse(bad).success).toBe(false);
  });
});

describe("parseBlocksLenient", () => {
  it("drops invalid blocks and keeps valid ones", () => {
    const out = parseBlocksLenient([everyBlock[0], { type: "hologram" }, everyBlock[1]]);
    expect(out.map((b) => b.id)).toEqual(["p1", "h1"]);
  });

  it("assigns missing ids and de-duplicates repeated ids", () => {
    const out = parseBlocksLenient([
      { type: "paragraph", md: "a" },
      { type: "paragraph", id: "same", md: "b" },
      { type: "paragraph", id: "same", md: "c" },
    ]);
    const ids = out.map((b) => b.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it("returns [] for non-arrays", () => {
    expect(parseBlocksLenient("nope")).toEqual([]);
  });
});
