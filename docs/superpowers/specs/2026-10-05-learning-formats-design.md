# Easy Learn — Learning formats

Date: 2026-10-05 · Status: owner chose the formats; details delegated

## 1. Goal

Besides multi-lesson courses (still the default), offer short, single-page ways to learn a topic that "stay there":
**Explainer, Quick bite, Playground, Map, Story, Cheat sheet**.

## 2. Model

Reuse the course machinery. `courses.format` ∈ `course | explainer | bite | playground | map | story | cheatsheet`
(default `course`). Every non-course format is a course with exactly one lesson (position 0). Optional
`courses.parent_id` links an item to the item it came from (a map's quick bites, a course's cheat sheet).

Everything per-lesson keeps working unchanged: themes/fonts, covers, polling, sections, custom widgets,
select-to-ask threads, highlights, variants, quizzes, routing/presets, the authoring API (document gains
optional `"format"`, default `course`).

## 3. Formats

| id | Label | Lesson plan | Writing guidance |
|---|---|---|---|
| explainer | Explainer | 3–5 sections | 5–10 min, 1–2 widgets per section, answers one question deeply |
| bite | Quick bite | 1–2 sections | ~250–450 words total, exactly one widget, one idea |
| playground | Playground | 2–3 sections | section 1 = short setup + one large `custom` simulation (height ≥ 520) + "things to try" list; then "what's going on" |
| map | Map | 1–2 sections | section 1 = intro + one `conceptMap` block (8–16 nodes); optional "where to start" |
| story | Story | 4–6 sections | narrative through people/places/events; prefers timeline, scrolly, quote |
| cheatsheet | Cheat sheet | 2–4 sections | dense reference: headings, lists, formula, compare, cards; minimal prose |

Flow for single-page formats: home → outline job (format-aware prompt, exactly one lesson) → course becomes
`active` automatically → lesson plan + sections generate → the page opens directly in the reader (the course
URL redirects to its lesson).

## 4. Concept map block

```ts
{ type: "conceptMap", id, nodes: [{ id, label, summary, x: 0–100, y: 0–100, group?: 0–3 }] (4–24),
  edges: [{ from, to, label? }], caption? }
```
Rendered as an SVG graph (positions from the AI, normalised; edges as soft curves; groups tint nodes with
accent/accent2/muted). Selecting a node shows its summary and **"Open a quick bite"** → `POST /api/maps/:lessonId/bites`
`{ nodeId }` creates (or reuses) a Quick bite item with `parent_id` = the map and topic "<node label> (in the
context of <map title>)", then navigates to it. Validation: unique node ids, edges reference existing nodes.

## 5. UI

- Home: format picker (chips with icons) under the input; placeholder per format. Library: filter chips
  (All + formats present). Cards show a format badge; single-page items link to their lesson.
- Reader: for single-page formats, no "Lesson n of m", no course overview link; end box offers "Go deeper →
  turn this into a course" (creates a course from the item's topic) and the quiz on request.
- Course page: "Make a cheat sheet" (creates a cheat sheet with `parent_id`, using the course's written text
  as source material).

## 6. Testing

Schema (conceptMap, format), prompts per format, pipeline per format with the mock provider (one lesson, auto
start, section count bounds), map → bite creation (idempotent per node), cheat sheet from course, authoring with
format, redirect for single-page items, e2e: create an explainer and read it.
