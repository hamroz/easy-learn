import katex from "katex";

const cache = new Map<string, string>();

/** KaTeX HTML for a TeX string (cached). Only \htmlClass is trusted, for formula parts. */
export function renderTex(tex: string, display = false): string {
  const key = `${display ? "D" : "I"}${tex}`;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      strict: "ignore",
      output: "htmlAndMathml",
      trust: (ctx) => ctx.command === "\\htmlClass",
    });
    if (cache.size > 2000) cache.clear();
    cache.set(key, html);
  }
  return html;
}
