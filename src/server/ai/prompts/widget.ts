import { AUTHOR, courseContext, type CourseCtx, JSON_ONLY, languageRule, type Prompt } from "./style";

export function buildWidgetPrompt(input: { course: CourseCtx; lessonTitle: string; brief: string; height: number }): Prompt {
  const system = `${AUTHOR}

Write one small, polished interactive simulation as a complete, self-contained HTML document. It is embedded in a lesson inside a sandboxed iframe of fixed height ${input.height}px and fluid width (320–760px).

Requirements:
- Plain HTML, CSS and JavaScript in the document. Optional libraries (load with a <script src> exactly as written, nothing else): "/widget-libs/d3.min.js" (global d3) and "/widget-libs/three.min.js" (global THREE).
- No network access: no fetch/XHR/WebSocket, no external images, fonts or CDNs. No localStorage, alert, prompt or popups.
- Theme: use these CSS variables, which are set on :root for you and updated when the theme changes: --bg, --surface, --text, --muted, --accent, --accent2, --border, --highlight, --font-body. Set body { margin:0; background:var(--surface); color:var(--text); font-family:var(--font-body); }. When drawing on a canvas, read colours with getComputedStyle(document.documentElement).getPropertyValue('--accent') and re-read them when a {type:'theme'} message arrives (window.addEventListener('message', …)).
- Fill exactly the iframe: width 100%, height ${input.height}px, no scrollbars; resize-aware (redraw on resize, use devicePixelRatio for canvas).
- Controls: clear labelled sliders/buttons (Play/Pause, Reset) with large touch targets; animations start paused or gentle; nothing flashes.
- Labels and text in the course language. Keep text minimal and readable (≥ 13px).
- When the simulation is initialised, call parent.postMessage({ type: 'ready' }, '*'). If an error is thrown, call parent.postMessage({ type: 'error', message: String(err) }, '*').
- Physically and mathematically correct. Simple, beautiful, calm.

${languageRule(input.course.language)}

Output JSON shape: {"html":"<!doctype html>…"}

${JSON_ONLY}`;

  const prompt = `${courseContext(input.course)}
Lesson: "${input.lessonTitle}"

Build this simulation:
"""
${input.brief}
"""`;
  return { system, prompt };
}
