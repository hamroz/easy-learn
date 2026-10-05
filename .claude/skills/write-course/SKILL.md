---
name: write-course
description: Write an Easy Learn course (outline, theme and lessons with interactive widgets) and add it to the owner's Easy Learn instance. Use when the owner asks Claude Code to "create a lesson/course on Easy Learn", "teach me X on the platform", or to add a course they will read in the app.
---

# Writing an Easy Learn course from Claude Code

The owner reads courses in the Easy Learn app. You write the course as a JSON document, validate it, and send
it to the app's authoring API. The app renders it exactly like courses its own models write.

## 1. Understand the request
Topic, level (beginner / intermediate / advanced) and language come from the owner's message. Ask one short
question only if the topic is genuinely ambiguous. Default: beginner, the language the owner wrote in.

## 2. Read the source of truth (do not work from memory)
- `src/server/ai/prompts/style.ts` — `WRITING_STYLE`, `MARKDOWN_RULES`, `BLOCK_CATALOGUE`, `SVG_RULES`.
  Follow them exactly: calm, intuition first, no quizzes, widgets that let the reader *do* something.
- `src/server/ai/prompts/outline.ts` — how outlines and themes are designed.
- `src/server/ai/prompts/widget.ts` — rules for custom simulations (CSP: no network; `parent.postMessage({ type: 'ready' }, '*')`).
- `src/content/fonts.ts` — valid `fontPair` ids; `src/content/theme.ts` — theme shape.
- `examples/relativity.json` — a real, complete document to imitate.

## 3. Write the document
Save it as `authored/<slug>.json` (git-ignored):

```json
{
  "version": 1,
  "course": {
    "title": "…", "subtitle": "…", "topicPrompt": "<the owner's request>", "language": "en", "level": "beginner",
    "theme": { "name": "…", "mood": "…", "fontPair": "literata", "scheme": "light",
               "light": { "bg": "#…", "surface": "#…", "text": "#…", "muted": "#…", "accent": "#…", "accent2": "#…", "highlight": "#…", "border": "#…" },
               "dark":  { "…": "same keys" }, "texture": "dots", "radius": "soft" },
    "coverSvg": "<svg viewBox=\"0 0 800 400\">…only var(--accent) etc. colours, no text…</svg>"
  },
  "lessons": [
    { "title": "…", "summary": "…",
      "sections": [ { "heading": "…", "goal": "…", "blocks": [ { "type": "paragraph", "id": "s0p1", "md": "…" } ] } ] },
    { "title": "…", "summary": "…", "sections": [] }
  ]
}
```

- **How much to write:** fully write the first one or two lessons (4–6 sections each, ~300–650 words of prose per
  section, 1–2 widgets per section). Leave later lessons outline-only (`"sections": []`) — the app writes them
  on demand with the owner's configured models. Write everything only if the owner asks for it.
- **Ids:** unique within a section, prefixed by section (`s0p1`, `s0w1`, …).
- **Custom simulations:** you may include a `custom` block with `"status": "ready"` and your own `"code"` (a
  complete HTML document following `widget.ts` rules) plus a library `fallback`. Keep it small and robust.
- **Plots:** curves are functions of `x`; sliders are extra parameters used by the curves (the validator checks).
- `coverSvg` may be omitted — the app then draws one.

## 4. Validate, preview, then send
If the course has a custom simulation, preview it on the dev server first when one is running.

```bash
npx tsx scripts/validate-course.ts authored/<slug>.json
npx tsx --env-file=.env --env-file=.env.local scripts/send-course.ts authored/<slug>.json
```
Fix every validation issue and re-run. `send-course` needs `EASY_LEARN_URL` (local Docker: `http://localhost:3100`)
and `EASY_LEARN_TOKEN` in `.env` or `.env.local`; if the token is missing, ask the owner to create one in
Settings → Authoring access and add it there (never ask them to paste it into chat).

## 5. Report
Give the owner the course link the script prints, the lesson list, and which lessons are fully written.
