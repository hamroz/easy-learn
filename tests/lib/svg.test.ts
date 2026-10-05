// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyVisibility } from "@/lib/svg";

describe("applyVisibility", () => {
  it("does not throw on ids with quotes or backslashes", () => {
    const div = document.createElement("div");
    div.innerHTML = `<svg><g id='w1-a"b'></g></svg>`;
    expect(() => applyVisibility(div, "w1", ['a"b', "c\\\\d"], new Set(['a"b']))).not.toThrow();
    expect((div.querySelector("g") as SVGElement).style.opacity).toBe("1");
  });
});
