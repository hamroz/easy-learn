import {
  Fraunces,
  IBM_Plex_Sans,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Literata,
  Newsreader,
  Nunito,
  Source_Sans_3,
  Source_Serif_4,
  Space_Grotesk,
} from "next/font/google";

// next/font needs literal options, so subsets are written out per font.
export const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], variable: "--font-inter", display: "swap" });
export const interTight = Inter_Tight({ subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], variable: "--font-inter-tight", display: "swap" });
export const newsreader = Newsreader({ subsets: ["latin", "latin-ext"], variable: "--font-newsreader", display: "swap", style: ["normal", "italic"] });
export const sourceSerif = Source_Serif_4({ subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], variable: "--font-source-serif", display: "swap", style: ["normal", "italic"] });
export const sourceSans = Source_Sans_3({ subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], variable: "--font-source-sans", display: "swap" });
export const fraunces = Fraunces({ subsets: ["latin", "latin-ext"], variable: "--font-fraunces", display: "swap", axes: ["SOFT", "opsz"] });
export const literata = Literata({ subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], variable: "--font-literata", display: "swap", style: ["normal", "italic"] });
export const spaceGrotesk = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-space-grotesk", display: "swap" });
export const plexSans = IBM_Plex_Sans({ subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], variable: "--font-plex-sans", display: "swap" });
export const jetbrains = JetBrains_Mono({ subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], variable: "--font-jetbrains", display: "swap" });
export const nunito = Nunito({ subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], variable: "--font-nunito", display: "swap" });

export const fontVariables = [
  inter,
  interTight,
  newsreader,
  sourceSerif,
  sourceSans,
  fraunces,
  literata,
  spaceGrotesk,
  plexSans,
  jetbrains,
  nunito,
]
  .map((f) => f.variable)
  .join(" ");
