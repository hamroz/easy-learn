import type { CSSProperties } from "react";
import { DEFAULT_THEME, type FontPair, PALETTE_KEYS, type Theme } from "@/content/theme";

/** Font stacks per curated pair. Latin-only display faces fall back to a Cyrillic-capable face. */
export const FONT_STACKS: Record<FontPair, { heading: string; body: string }> = {
  editorial: {
    heading: "var(--font-newsreader), var(--font-literata), Georgia, serif",
    body: "var(--font-newsreader), var(--font-literata), Georgia, serif",
  },
  classic: {
    heading: "var(--font-source-serif), Georgia, serif",
    body: "var(--font-source-serif), Georgia, serif",
  },
  modern: {
    heading: "var(--font-inter-tight), var(--font-inter), system-ui, sans-serif",
    body: "var(--font-inter), system-ui, sans-serif",
  },
  humanist: {
    heading: "var(--font-fraunces), var(--font-literata), Georgia, serif",
    body: "var(--font-literata), Georgia, serif",
  },
  technical: {
    heading: "var(--font-space-grotesk), var(--font-inter-tight), system-ui, sans-serif",
    body: "var(--font-plex-sans), var(--font-inter), system-ui, sans-serif",
  },
  storybook: {
    heading: "var(--font-nunito), system-ui, sans-serif",
    body: "var(--font-nunito), system-ui, sans-serif",
  },
};

const RADIUS = { sharp: "4px", soft: "12px", round: "20px" } as const;

/** CSS custom properties for a theme. Light/dark switching happens in globals.css (.themed). */
export function themeStyle(theme: Theme | null | undefined): CSSProperties {
  const t = theme ?? DEFAULT_THEME;
  const vars: Record<string, string> = {};
  for (const k of PALETTE_KEYS) {
    vars[`--l-${k}`] = t.light[k];
    vars[`--d-${k}`] = t.dark[k];
  }
  const fonts = FONT_STACKS[t.fontPair] ?? FONT_STACKS.editorial;
  vars["--font-heading"] = fonts.heading;
  vars["--font-body"] = fonts.body;
  vars["--radius"] = RADIUS[t.radius] ?? RADIUS.soft;
  return vars as CSSProperties;
}

export function themeClass(theme: Theme | null | undefined) {
  return `themed tex-${(theme ?? DEFAULT_THEME).texture}`;
}
