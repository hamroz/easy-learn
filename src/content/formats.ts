/** Ways to learn a topic. Every format except "course" is a single page (a one-lesson course). */

export const FORMATS = [
  { id: "course", label: "Course", noun: "course", icon: "M4 6h16M4 12h16M4 18h10", minutes: "several lessons", sections: [3, 8], placeholder: "The theory of relativity — I know nothing about physics, and I'd love to finally understand why time slows down…" },
  { id: "explainer", label: "Explainer", noun: "explainer", icon: "M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4", minutes: "5–10 min", sections: [3, 5], placeholder: "How does GPS know exactly where I am?" },
  { id: "bite", label: "Quick bite", noun: "quick bite", icon: "M13 2L4 14h7l-1 8 9-12h-7z", minutes: "2 min", sections: [1, 2], placeholder: "Why is the sky blue?" },
  { id: "playground", label: "Playground", noun: "playground", icon: "M8 13V5a2 2 0 0 1 4 0v6m0-1a2 2 0 0 1 4 0v3m0-1a2 2 0 0 1 4 0v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-3l-2-4a2 2 0 0 1 3-2l1 2", minutes: "play", sections: [2, 3], placeholder: "Let me play with gravity and orbits" },
  { id: "map", label: "Map", noun: "map", icon: "M12 5a2 2 0 1 0 0 .01M5 18a2 2 0 1 0 0 .01M19 18a2 2 0 1 0 0 .01M12 7v4m0 0l-6 6m6-6l6 6", minutes: "explore", sections: [1, 2], placeholder: "Map out the world of machine learning" },
  { id: "story", label: "Story", noun: "story", icon: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 21V5", minutes: "8–12 min", sections: [4, 6], placeholder: "The race to split the atom" },
  { id: "cheatsheet", label: "Cheat sheet", noun: "cheat sheet", icon: "M9 4h10M9 9h10M9 14h10M9 19h10M5 4h.01M5 9h.01M5 14h.01M5 19h.01", minutes: "reference", sections: [2, 4], placeholder: "Cheat sheet: the essentials of personal finance" },
] as const;

export type FormatId = (typeof FORMATS)[number]["id"];
export const FORMAT_IDS = FORMATS.map((f) => f.id) as [FormatId, ...FormatId[]];

export function formatInfo(id: string | null | undefined) {
  return FORMATS.find((f) => f.id === id) ?? FORMATS[0];
}

export const isSinglePage = (id: string | null | undefined) => formatInfo(id).id !== "course";
