// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlockView } from "@/components/reader/BlockView";
import { ReaderContext } from "@/components/reader/ReaderContext";
import { blockSchema, type Block } from "@/content/blocks";

afterEach(cleanup);

const map = blockSchema.parse({
  type: "conceptMap",
  id: "m1",
  nodes: [
    { id: "atom", label: "Atom", summary: "The smallest piece of an element.", x: 50, y: 10 },
    { id: "ion", label: "Ion", summary: "A **charged** atom.", x: 20, y: 70, group: 1 },
    { id: "bond", label: "Bond", summary: "How atoms join.", x: 80, y: 70 },
    { id: "mol", label: "Molecule", summary: "Atoms joined together.", x: 50, y: 95 },
  ],
  edges: [
    { from: "atom", to: "ion", label: "loses electrons" },
    { from: "atom", to: "bond" },
  ],
}) as Block;

describe("ConceptMap", () => {
  it("draws every node and edge", () => {
    const { container } = render(<BlockView block={map} sectionId="s" />);
    expect(container.querySelectorAll("[data-node]")).toHaveLength(4);
    expect(container.querySelectorAll("[data-edge]")).toHaveLength(2);
    expect(container.textContent).toContain("loses electrons");
  });

  it("shows a node's summary when selected, and offers a quick bite inside the reader", () => {
    const openBite = vi.fn();
    const { container, getByRole } = render(
      <ReaderContext.Provider value={{ lessonId: "l1", openBite }}>
        <BlockView block={map} sectionId="s" />
      </ReaderContext.Provider>,
    );
    fireEvent.click(container.querySelector('[data-node="ion"]')!);
    expect(container.textContent).toContain("charged");
    fireEvent.click(getByRole("button", { name: /quick bite/i }));
    expect(openBite).toHaveBeenCalledWith("ion");
  });

  it("does not offer quick bites outside the reader", () => {
    const { container, queryByRole } = render(<BlockView block={map} sectionId="s" />);
    fireEvent.click(container.querySelector('[data-node="atom"]')!);
    expect(queryByRole("button", { name: /quick bite/i })).toBeNull();
  });

  it("recovers when opening a quick bite fails", async () => {
    const openBite = vi.fn().mockRejectedValue(new Error("Server unavailable"));
    const { container, getByRole } = render(
      <ReaderContext.Provider value={{ lessonId: "l1", openBite }}>
        <BlockView block={map} sectionId="s" />
      </ReaderContext.Provider>,
    );
    fireEvent.click(container.querySelector('[data-node="ion"]')!);
    await act(async () => {
      fireEvent.click(getByRole("button", { name: /quick bite/i }));
    });
    expect((getByRole("button", { name: /quick bite/i }) as HTMLButtonElement).disabled).toBe(false);
    expect(container.textContent).toContain("Server unavailable");
  });
});
