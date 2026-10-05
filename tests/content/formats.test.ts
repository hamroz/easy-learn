import { describe, expect, it } from "vitest";
import { blockSchema, parseBlocksLenient } from "@/content/blocks";
import { FORMATS, formatInfo, isSinglePage } from "@/content/formats";

const map = {
  type: "conceptMap",
  id: "m1",
  nodes: [
    { id: "atom", label: "Atom", summary: "The smallest piece of an element.", x: 50, y: 20 },
    { id: "ion", label: "Ion", summary: "A charged atom.", x: 20, y: 70, group: 1 },
    { id: "bond", label: "Bond", summary: "How atoms join.", x: 80, y: 70 },
    { id: "mol", label: "Molecule", summary: "Atoms joined together.", x: 50, y: 90 },
  ],
  edges: [
    { from: "atom", to: "ion", label: "gains or loses electrons" },
    { from: "atom", to: "bond" },
    { from: "bond", to: "mol" },
  ],
};

describe("formats", () => {
  it("lists the seven formats with course first", () => {
    expect(FORMATS.map((f) => f.id)).toEqual(["course", "explainer", "bite", "playground", "map", "story", "cheatsheet"]);
    expect(isSinglePage("course")).toBe(false);
    expect(isSinglePage("bite")).toBe(true);
    expect(formatInfo("explainer").sections).toEqual([3, 5]);
    expect(formatInfo("unknown" as never).id).toBe("course");
  });
});

describe("conceptMap block", () => {
  it("parses a valid map", () => {
    expect(blockSchema.safeParse(map).success).toBe(true);
  });
  it("rejects edges to unknown nodes and duplicate node ids", () => {
    expect(blockSchema.safeParse({ ...map, edges: [{ from: "atom", to: "ghost" }] }).success).toBe(false);
    expect(blockSchema.safeParse({ ...map, nodes: [...map.nodes, { ...map.nodes[0] }] }).success).toBe(false);
  });
  it("lenient parsing keeps the map and drops only the bad edges", () => {
    const [b] = parseBlocksLenient([{ ...map, edges: [...map.edges, { from: "atom", to: "ghost" }] }]);
    expect(b.type).toBe("conceptMap");
    expect(b.type === "conceptMap" && b.edges).toHaveLength(3);
  });
});
