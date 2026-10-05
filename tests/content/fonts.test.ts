import { describe, expect, it } from "vitest";
import { DEFAULT_FONTS, FONT_IDS, normalizeEnabledFonts, resolveFont } from "@/content/fonts";
import { themeSchema } from "@/content/theme";
import { buildOutlinePrompt } from "@/server/ai/prompts/outline";

describe("font catalogue", () => {
  it("has ten combinations and defaults to Literata, Inter and IBM Plex", () => {
    expect(FONT_IDS).toHaveLength(10);
    expect(DEFAULT_FONTS).toEqual(["literata", "inter", "plex"]);
  });

  it("maps legacy theme font ids forward", () => {
    expect(themeSchema.parse({ fontPair: "editorial" }).fontPair).toBe("newsreader");
    expect(themeSchema.parse({ fontPair: "technical" }).fontPair).toBe("grotesk");
    expect(themeSchema.parse({ fontPair: "nonsense" }).fontPair).toBe("literata");
  });

  it("resolves a disabled font to the first enabled one", () => {
    expect(resolveFont("newsreader", ["inter", "plex"])).toBe("inter");
    expect(resolveFont("plex", ["inter", "plex"])).toBe("plex");
  });

  it("never allows an empty or unknown enabled list", () => {
    expect(normalizeEnabledFonts([])).toEqual(DEFAULT_FONTS);
    expect(normalizeEnabledFonts(["plex", "comic-sans", "plex"])).toEqual(["plex"]);
  });

  it("offers only enabled fonts to the outline prompt", () => {
    const p = buildOutlinePrompt({ topic: "x", level: "beginner", fonts: ["inter", "lora"] });
    expect(p.system).toContain("inter");
    expect(p.system).toContain("lora");
    expect(p.system).not.toContain("grotesk");
  });
});
