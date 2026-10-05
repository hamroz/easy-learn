/** Curated lesson font combinations. The owner switches on the ones courses may use (Settings → Fonts). */

export const FONT_CATALOGUE = [
  { id: "literata", name: "Literata", description: "made for long reading on screens", heading: "var(--font-literata), Georgia, serif", body: "var(--font-literata), Georgia, serif" },
  { id: "inter", name: "Inter", description: "clean and modern, no serifs", heading: "var(--font-inter-tight), var(--font-inter), system-ui, sans-serif", body: "var(--font-inter), system-ui, sans-serif" },
  { id: "plex", name: "IBM Plex Sans", description: "precise, a little technical", heading: "var(--font-plex-sans), system-ui, sans-serif", body: "var(--font-plex-sans), system-ui, sans-serif" },
  { id: "newsreader-inter", name: "Newsreader + Inter", description: "elegant serif headings, clean text", heading: "var(--font-newsreader), var(--font-literata), Georgia, serif", body: "var(--font-inter), system-ui, sans-serif" },
  { id: "source-serif", name: "Source Serif", description: "classic book serif", heading: "var(--font-source-serif), Georgia, serif", body: "var(--font-source-serif), Georgia, serif" },
  { id: "lora", name: "Lora", description: "soft, warm serif", heading: "var(--font-lora), Georgia, serif", body: "var(--font-lora), Georgia, serif" },
  { id: "fraunces", name: "Fraunces + Literata", description: "characterful headings, bookish text", heading: "var(--font-fraunces), var(--font-literata), Georgia, serif", body: "var(--font-literata), Georgia, serif" },
  { id: "grotesk", name: "Space Grotesk + Plex", description: "geometric, for computing and engineering", heading: "var(--font-space-grotesk), var(--font-inter-tight), system-ui, sans-serif", body: "var(--font-plex-sans), system-ui, sans-serif" },
  { id: "newsreader", name: "Newsreader", description: "fine magazine serif", heading: "var(--font-newsreader), var(--font-literata), Georgia, serif", body: "var(--font-newsreader), var(--font-literata), Georgia, serif" },
  { id: "nunito", name: "Nunito", description: "friendly and rounded", heading: "var(--font-nunito), system-ui, sans-serif", body: "var(--font-nunito), system-ui, sans-serif" },
] as const;

export type FontId = (typeof FONT_CATALOGUE)[number]["id"];
export const FONT_IDS = FONT_CATALOGUE.map((f) => f.id) as [FontId, ...FontId[]];
export const DEFAULT_FONTS: FontId[] = ["literata", "inter", "plex"];

/** Theme ids from before the catalogue existed. */
export const LEGACY_FONT_IDS: Record<string, FontId> = {
  editorial: "newsreader",
  classic: "source-serif",
  modern: "inter",
  humanist: "fraunces",
  technical: "grotesk",
  storybook: "nunito",
};

const isFontId = (v: unknown): v is FontId => typeof v === "string" && (FONT_IDS as string[]).includes(v);

export function normalizeEnabledFonts(list: unknown): FontId[] {
  const out = Array.isArray(list) ? [...new Set(list.filter(isFontId))] : [];
  return out.length ? out : [...DEFAULT_FONTS];
}

/** The font a course actually renders with: its own if still enabled, otherwise the first enabled one. */
export function resolveFont(pair: string | null | undefined, enabled: readonly FontId[]): FontId {
  const list = enabled.length ? enabled : DEFAULT_FONTS;
  return pair && (list as string[]).includes(pair) ? (pair as FontId) : list[0];
}

export function fontById(id: FontId) {
  return FONT_CATALOGUE.find((f) => f.id === id) ?? FONT_CATALOGUE[0];
}
