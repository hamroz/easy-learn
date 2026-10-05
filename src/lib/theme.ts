import type { CSSProperties } from "react";
import { DEFAULT_FONTS, fontById, type FontId, resolveFont } from "@/content/fonts";
import { DEFAULT_THEME, PALETTE_KEYS, type Theme } from "@/content/theme";

const RADIUS = { sharp: "4px", soft: "12px", round: "20px" } as const;

/** CSS custom properties for a theme. Light/dark switching happens in globals.css (.themed). */
export function themeStyle(theme: Theme | null | undefined, enabledFonts: readonly FontId[] = DEFAULT_FONTS): CSSProperties {
  const t = theme ?? DEFAULT_THEME;
  const vars: Record<string, string> = {};
  for (const k of PALETTE_KEYS) {
    vars[`--l-${k}`] = t.light[k];
    vars[`--d-${k}`] = t.dark[k];
  }
  const fonts = fontById(resolveFont(t.fontPair, enabledFonts));
  vars["--font-heading"] = fonts.heading;
  vars["--font-body"] = fonts.body;
  vars["--radius"] = RADIUS[t.radius] ?? RADIUS.soft;
  return vars as CSSProperties;
}

export function themeClass(theme: Theme | null | undefined) {
  return `themed tex-${(theme ?? DEFAULT_THEME).texture}`;
}
