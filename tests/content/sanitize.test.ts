import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "@/server/content/sanitize";

describe("sanitizeSvg", () => {
  it("removes scripts, event handlers, foreignObject and external images", () => {
    const out = sanitizeSvg(
      `<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(1)</script><foreignObject><div>x</div></foreignObject><image href="https://evil.test/a.png"/><circle id="c" r="2" fill="var(--accent)"/></svg>`,
    );
    expect(out).not.toMatch(/script|onload|foreignObject|<image|evil/);
    expect(out).toContain('id="c"');
    expect(out).toContain("var(--accent)");
  });

  it("keeps markers and internal url() references", () => {
    const out = sanitizeSvg(`<svg viewBox="0 0 1 1"><defs><marker id="h"><path d="M0,0"/></marker></defs><path d="M0 0" marker-end="url(#h)"/></svg>`);
    expect(out).toContain("marker-end");
    expect(out).toContain("<marker");
  });

  it("returns an empty string for non-SVG input", () => {
    expect(sanitizeSvg("<div>hello</div>")).toBe("");
  });
});
