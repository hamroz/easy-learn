// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlockView } from "@/components/reader/BlockView";
import { BlockBoundary } from "@/components/reader/BlockBoundary";
import { Markdown } from "@/components/reader/Markdown";
import { blockSchema, type Block } from "@/content/blocks";
import { scopeSvg } from "@/lib/svg";
import { everyBlock } from "../fixtures/blocks";

afterEach(cleanup);

const blocks = everyBlock.map((b) => blockSchema.parse(b));

describe("BlockView", () => {
  it.each(blocks.map((b) => [b.type, b] as const))("renders %s without throwing", (_type, block) => {
    const { container } = render(<BlockView block={block as Block} sectionId="s" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("marks text blocks as selectable with their block id", () => {
    const { container } = render(<BlockView block={blocks[0]} sectionId="s" />);
    expect(container.querySelector('[data-block-id="p1"][data-selectable]')).toBeTruthy();
  });

  it("plot redraws when a slider moves", () => {
    const plot = blocks.find((b) => b.type === "plot")!;
    const { container } = render(<BlockView block={plot} sectionId="s" />);
    const path = () => container.querySelector("path[data-curve]")!.getAttribute("d");
    const before = path();
    fireEvent.change(container.querySelector('input[type="range"]')!, { target: { value: "2" } });
    expect(path()).not.toBe(before);
  });

  it("custom widget falls back to its library widget when it never reports ready", () => {
    vi.useFakeTimers();
    const custom = blockSchema.parse({ ...everyBlock.at(-1), status: "ready", code: "<html><body>silent</body></html>" });
    const { container } = render(<BlockView block={custom} sectionId="s" />);
    expect(container.querySelector("iframe")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(container.querySelector("iframe")).toBeFalsy();
    expect(container.textContent).toContain("p"); // fallback reveal prompt
    vi.useRealTimers();
  });

  it("custom widget shows the fallback while its code is still being written", () => {
    const { container } = render(<BlockView block={blocks.at(-1)!} sectionId="s" />);
    expect(container.querySelector("iframe")).toBeFalsy();
    expect(container.textContent).toMatch(/simulation/i);
  });
});

describe("BlockBoundary", () => {
  it("contains a widget that throws instead of crashing the lesson", () => {
    const Boom = () => {
      throw new Error("bad AI widget");
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <div>
        <p>before</p>
        <BlockBoundary>
          <Boom />
        </BlockBoundary>
        <p>after</p>
      </div>,
    );
    spy.mockRestore();
    expect(container.textContent).toContain("before");
    expect(container.textContent).toContain("after");
    expect(container.textContent).toMatch(/could not be shown/i);
  });
});

describe("Markdown", () => {
  it("renders bold, italic, code, links and inline math", () => {
    const { container } = render(<Markdown md={"**b** *i* `c` [l](https://example.com) $x^2$"} />);
    expect(container.querySelector("strong")?.textContent).toBe("b");
    expect(container.querySelector("em")?.textContent).toBe("i");
    expect(container.querySelector("code")?.textContent).toBe("c");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
    expect(container.querySelector(".katex")).toBeTruthy();
  });

  it("does not treat prices as math", () => {
    const { container } = render(<Markdown md={"It costs $5 and $10 today."} />);
    expect(container.querySelector(".katex")).toBeFalsy();
    expect(container.textContent).toBe("It costs $5 and $10 today.");
  });

  it("drops javascript: links", () => {
    const { container } = render(<Markdown md={"[x](javascript:alert(1))"} />);
    expect(container.querySelector("a")).toBeFalsy();
  });
});

describe("scopeSvg", () => {
  it("prefixes ids and their url()/href references", () => {
    const out = scopeSvg('<svg><marker id="h"/><path id="p" marker-end="url(#h)"/><use href="#p"/></svg>', "w1");
    expect(out).toContain('id="w1-h"');
    expect(out).toContain("url(#w1-h)");
    expect(out).toContain('href="#w1-p"');
  });
});
