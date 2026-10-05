import { describe, expect, it } from "vitest";
import { contrastRatio, ensureContrast } from "@/content/color";
import { DEFAULT_THEME, normalizeTheme, themeSchema } from "@/content/theme";

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for equal colours", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777", "#777777")).toBeCloseTo(1, 5);
  });
});

describe("ensureContrast", () => {
  it("leaves passing colours untouched", () => {
    expect(ensureContrast("#111111", "#ffffff", 7)).toBe("#111111");
  });
  it("darkens on light backgrounds until the minimum is met", () => {
    const fixed = ensureContrast("#aaaaaa", "#ffffff", 7);
    expect(contrastRatio(fixed, "#ffffff")).toBeGreaterThanOrEqual(7);
  });
  it("lightens on dark backgrounds until the minimum is met", () => {
    const fixed = ensureContrast("#333333", "#101010", 4.5);
    expect(contrastRatio(fixed, "#101010")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("normalizeTheme", () => {
  it("raises low-contrast palettes to text ≥ 7, muted ≥ 4.5, accent ≥ 3", () => {
    const t = normalizeTheme(
      themeSchema.parse({
        ...DEFAULT_THEME,
        light: { ...DEFAULT_THEME.light, bg: "#ffffff", text: "#cccccc", muted: "#eeeeee", accent: "#fafafa" },
        dark: { ...DEFAULT_THEME.dark, bg: "#000000", text: "#222222", muted: "#111111", accent: "#050505" },
      }),
    );
    for (const p of [t.light, t.dark]) {
      expect(contrastRatio(p.text, p.bg)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(p.muted, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.accent, p.bg)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(p.accent2, p.bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it("replaces invalid colours and enum values with defaults", () => {
    const t = themeSchema.parse({ name: "x", fontPair: "comic-sans", light: { bg: "blue" }, texture: "lava" });
    expect(t.fontPair).toBe(DEFAULT_THEME.fontPair);
    expect(t.texture).toBe("none");
    expect(t.light.bg).toBe(DEFAULT_THEME.light.bg);
  });
});
