// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildAnchor, rangeFromOffsets, reanchor, selectableText, textOffsetsFromRange } from "@/lib/anchors";

function dom(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

describe("anchors", () => {
  it("round-trips offsets across nested inline elements", () => {
    const root = dom(`<p data-selectable>Light is <strong>very <em>fast</em></strong> indeed.</p>`).firstElementChild!;
    expect(selectableText(root)).toBe("Light is very fast indeed.");
    const em = root.querySelector("em")!.firstChild!;
    const r = document.createRange();
    r.setStart(root.firstChild!, 6); // "is …"
    r.setEnd(em, 2); // "fa"
    const off = textOffsetsFromRange(root, r)!;
    expect(off).toEqual({ start: 6, end: 16 });
    expect(rangeFromOffsets(root, off.start, off.end)!.toString()).toBe("is very fa");
  });

  it("ignores KaTeX MathML text when counting", () => {
    const root = dom(
      `<p>Speed <span class="katex"><span class="katex-mathml"><math><mi>c</mi></math></span><span class="katex-html" aria-hidden="true">c</span></span> is fixed.</p>`,
    ).firstElementChild!;
    expect(selectableText(root)).toBe("Speed c is fixed.");
    const last = root.lastChild!; // " is fixed."
    const r = document.createRange();
    r.setStart(last, 1);
    r.setEnd(last, 3);
    expect(textOffsetsFromRange(root, r)).toEqual({ start: 8, end: 10 });
  });

  it("returns null when the selection leaves the block", () => {
    const wrap = dom(`<p id="a">one</p><p id="b">two</p>`);
    const a = wrap.querySelector("#a")!;
    const r = document.createRange();
    r.setStart(a.firstChild!, 1);
    r.setEnd(wrap.querySelector("#b")!.firstChild!, 1);
    expect(textOffsetsFromRange(a, r)).toBeNull();
  });

  it("builds an anchor with quote, prefix and suffix", () => {
    const root = dom(`<p>The quick brown fox jumps.</p>`).firstElementChild!;
    const r = rangeFromOffsets(root, 10, 15)!;
    expect(buildAnchor(root, r)).toEqual({ start: 10, end: 15, quote: "brown", prefix: "The quick ", suffix: " fox jumps." });
  });
});

describe("word snapping", () => {
  it("expands a selection that starts or ends mid-word to whole words", () => {
    const root = dom(`<p>Imagine you are standing on a train platform.</p>`).firstElementChild!;
    const r = rangeFromOffsets(root, 13, 37)!; // "re standing on a train p"
    expect(buildAnchor(root, r)?.quote).toBe("are standing on a train platform");
  });
  it("works for non-Latin words and trims surrounding spaces", () => {
    const root = dom(`<p>Скорость света постоянна.</p>`).firstElementChild!;
    const r = rangeFromOffsets(root, 8, 13)!; // " свет"
    expect(buildAnchor(root, r)?.quote).toBe("света");
  });
});

describe("reanchor", () => {
  const anchor = { start: 10, end: 15, quote: "brown", prefix: "The quick ", suffix: " fox" };
  it("keeps offsets that still match", () => {
    expect(reanchor("The quick brown fox", anchor)).toEqual({ start: 10, end: 15 });
  });
  it("finds a moved quote via its prefix and suffix", () => {
    expect(reanchor("A brown dog. The quick brown fox", anchor)).toEqual({ start: 23, end: 28 });
  });
  it("falls back to the quote alone, nearest the old position", () => {
    expect(reanchor("brown xx brown", { ...anchor, prefix: "zz", suffix: "zz" })).toEqual({ start: 9, end: 14 });
  });
  it("returns null when the quote is gone", () => {
    expect(reanchor("nothing here", anchor)).toBeNull();
  });
});
