import { z } from "zod";
import { ensureContrast, isHex } from "./color";
import { FONT_IDS, type FontId, LEGACY_FONT_IDS } from "./fonts";

/** Per-course visual identity chosen by the AI at outline time (spec §5). */

export const TEXTURES = ["none", "grid", "dots", "paper", "stars", "waves"] as const;
export const RADII = ["sharp", "soft", "round"] as const;
export const PALETTE_KEYS = ["bg", "surface", "text", "muted", "accent", "accent2", "highlight", "border"] as const;

export type FontPair = FontId;
export type Palette = Record<(typeof PALETTE_KEYS)[number], string>;

const LIGHT: Palette = {
  bg: "#fbfaf7",
  surface: "#ffffff",
  text: "#1d1c1a",
  muted: "#5f5b54",
  accent: "#3b5bdb",
  accent2: "#c2410c",
  highlight: "#fde68a",
  border: "#e7e3dc",
};

const DARK: Palette = {
  bg: "#121212",
  surface: "#1b1b1d",
  text: "#ecebe8",
  muted: "#a6a29a",
  accent: "#8ea2ff",
  accent2: "#fb923c",
  highlight: "#7c5e10",
  border: "#2c2c30",
};

export type Theme = {
  name: string;
  mood: string;
  fontPair: FontPair;
  scheme: "light" | "dark";
  light: Palette;
  dark: Palette;
  texture: (typeof TEXTURES)[number];
  radius: (typeof RADII)[number];
};

export const DEFAULT_THEME: Theme = {
  name: "Quiet paper",
  mood: "calm",
  fontPair: "literata",
  scheme: "light",
  light: LIGHT,
  dark: DARK,
  texture: "none",
  radius: "soft",
};

function paletteSchema(defaults: Palette) {
  const shape = Object.fromEntries(
    PALETTE_KEYS.map((k) => [
      k,
      z
        .unknown()
        .transform((v) => (isHex(v) ? v.trim().toLowerCase() : defaults[k]))
        .default(defaults[k]),
    ]),
  ) as unknown as Record<(typeof PALETTE_KEYS)[number], z.ZodType<string>>;
  return z.object(shape).catch(defaults) as unknown as z.ZodType<Palette>;
}

/** Lenient: any malformed field falls back to the default rather than failing the outline. */
export const themeSchema: z.ZodType<Theme> = z.object({
  name: z.string().catch(DEFAULT_THEME.name).default(DEFAULT_THEME.name),
  mood: z.string().catch(DEFAULT_THEME.mood).default(DEFAULT_THEME.mood),
  fontPair: z.preprocess((v) => (typeof v === "string" && LEGACY_FONT_IDS[v]) || v, z.enum(FONT_IDS)).catch(DEFAULT_THEME.fontPair),
  scheme: z.enum(["light", "dark"]).catch("light"),
  light: paletteSchema(LIGHT).default(LIGHT),
  dark: paletteSchema(DARK).default(DARK),
  texture: z.enum(TEXTURES).catch("none"),
  radius: z.enum(RADII).catch("soft"),
}) as unknown as z.ZodType<Theme>;

function fixPalette(p: Palette): Palette {
  return {
    ...p,
    text: ensureContrast(p.text, p.bg, 7),
    muted: ensureContrast(p.muted, p.bg, 4.5),
    accent: ensureContrast(p.accent, p.bg, 3),
    accent2: ensureContrast(p.accent2, p.bg, 3),
  };
}

/** Enforce readable contrast in both palettes (text ≥ 7, muted ≥ 4.5, accents ≥ 3). */
export function normalizeTheme(t: Theme): Theme {
  return { ...t, light: fixPalette(t.light), dark: fixPalette(t.dark) };
}
