# Easy Learn — Design Spec

Date: 2026-10-05 · Status: approved direction (owner delegated remaining decisions) · Phase: 1 (personal use)

## 1. Purpose

Easy Learn turns "I want to learn X" into a calm, beautiful, interactive course. The owner types a topic, reviews an
AI-generated outline, then reads long-form explorable lessons (in the spirit of ciechanow.ski) with live widgets.
Any text can be selected to ask a follow-up question in a popover, without leaving the page; asked-about passages
stay highlighted. No unsolicited quizzes.

Success for phase 1: the owner uses it for real learning for a few months, on their own VPS, powered by their own
Codex/Claude subscriptions, and it feels pleasant enough to show on a CV.

### Phasing

| Phase 1 (this spec) | Phase 2 (later, not built now) |
|---|---|
| Single owner account behind a login | Open signup |
| AI via the official `codex` / `claude` CLIs signed in with the owner's subscriptions | Hybrid billing: free allowance on owner's API key + bring-your-own key; Claude subscription path stays owner-only |
| Example courses marked by the owner | Public gallery (`is_published`) |
| Local Docker, then the Fuse VPS | Same |

Seams kept for phase 2: every row has an owner (`user_id`), courses have `is_published`, the AI layer is a provider
interface, and auth is a regular users/sessions model rather than a hard-coded password.

### Subscription use (compliance notes)

- Claude: only the unmodified `claude` binary is invoked (`claude -p`), signed in through Anthropic's own `/login`
  flow inside the container. The app never reads, copies or forwards CLI credentials. The Agent SDK is not used with
  subscription auth. Only the owner uses the subscription.
- Codex: the official `codex exec` CLI, signed in with `codex login --device-auth` inside the container.
- No other person may use the subscription-backed providers. Phase 2 must enforce this.

## 2. Product

### Concepts

- **Course** — a topic. Has a title, subtitle, language, level, a generated visual **theme**, an optional cover SVG,
  and an ordered list of lessons.
- **Outline** — the course's lessons as `{title, summary}` items. Generated first and editable before learning starts:
  rename, reorder, delete, add, or "reshape" with a free-text instruction.
- **Lesson** — one chapter, a 10–15 minute long-scroll essay made of sections, each section a list of content blocks
  (paragraphs, callouts, math, widgets). Generated on first open; the next lesson is prefetched in the background.
- **Thread** — a question conversation anchored to a selected passage. Highlighted in the text; click to reopen.
- **Variant** — a "simpler" or "deeper" rewrite of a paragraph; the reader can switch between original and variants.
- **Quiz** — only on request ("Quiz me" at the end of a lesson).

### Screens

1. **Login / Setup** — email + password. `/setup` exists only while there are zero users and requires the
   `SETUP_TOKEN` from the environment; it closes after the owner is created.
2. **Home** — a large quiet prompt "What do you want to learn?", optional level selector (beginner/intermediate/
   advanced, default beginner), the owner's courses (with continue-reading), and example courses.
3. **Course / Outline** — cover, title, theme preview, editable lesson list, "Reshape" instruction box,
   "Start learning". After start, the same page becomes the course overview with progress per lesson.
4. **Lesson reader** — centred reading column (~68ch), slim section TOC + progress, widgets inline, selection popover,
   highlights, per-paragraph menu (Simpler / Deeper / Ask about this), "My questions" drawer, and a "What next?" box at
   the end (continue · steer the course with free text · quiz me).
5. **Settings** — provider (Codex CLI / Claude CLI / Mock), model for lessons, model for chat, default language,
   provider health check (shows "not logged in" with the exact login command).

### Writing style (enforced through prompts)

Calm, warm, intuition first; concrete examples and analogies before formalism; define every term at first use;
short paragraphs; one idea per paragraph; no condescension, no hype, no exclamation marks; the reader is never
tested unless they ask. Widgets must earn their place: each one lets the reader *do* something that builds intuition.

## 3. Architecture

```
Browser ── Next.js 16 (App Router, React 19, TypeScript, Tailwind 4)
             │  route handlers (/api/*) + server components
             │  in-process job runner (started from instrumentation.ts)
             ├── PostgreSQL 17 (Drizzle ORM) — all state, including the job queue
             └── AI provider ── spawn `codex exec` | `claude -p` | mock   (cwd: empty scratch dir, HOME: /data/home)
```

- One Docker image runs the Next standalone server and the job runner (same process). A Postgres container stores
  data. CLI sign-ins persist in a mounted home directory (`/data/home`).
- Long work (outline, lesson plan, sections, custom widgets, covers) goes through a Postgres-backed **job queue**
  (`jobs` table, `FOR UPDATE SKIP LOCKED`, leases, retries with backoff). Stale leases are reclaimed after restarts.
  Concurrency is limited (`AI_CONCURRENCY`, default 2) to respect subscription rate limits.
- Interactive work (thread answers, paragraph variants, quizzes) calls the provider directly from the route handler.
  Thread answers stream to the browser over SSE (Claude emits text deltas; Codex delivers the final message).
- Lesson progress is delivered by client polling (every 1.5 s while anything is pending): sections appear as they
  finish.

### AI provider interface

```ts
interface AIProvider {
  id: 'codex-cli' | 'claude-cli' | 'mock';
  complete(req: { system: string; prompt: string; model?: string; effort?: 'low'|'medium'|'high';
                  signal?: AbortSignal; onDelta?: (text: string) => void }): Promise<string>;
  health(): Promise<{ ok: boolean; message: string }>;
}
```

- **codex-cli**: `codex exec --json --skip-git-repo-check --ephemeral --ignore-user-config --sandbox read-only
  [-m model] [-c model_reasoning_effort=…] -` with the prompt on stdin; parses JSONL (`item.completed` with
  `agent_message`, `turn.failed`, `error`).
- **claude-cli**: `claude -p --output-format stream-json --verbose --include-partial-messages --tools ""
  --no-session-persistence --setting-sources "" --strict-mcp-config --disable-slash-commands --system-prompt …
  [--model …]` with the prompt on stdin; parses `stream_event` text deltas and the final `result`
  (`is_error`, `error: authentication_failed` → "not logged in").
- **mock**: deterministic, offline fixtures for tests, CI and UI work.
- Phase 2 adds `anthropic-api` and `openai-api` (BYOK) behind the same interface.
- `generateJson(schema, …)` wraps any provider: extract the JSON object from the reply, validate with zod, and on
  failure send one repair request containing the validation errors. Then fail the job with a readable error.
- Timeouts: 6 min for generation jobs, 2 min for interactive calls; the child process is killed on timeout/abort.

### Generation pipeline

1. `outline` job (from home prompt) → `{title, subtitle, language, level, theme, lessons[6–10]}`. Theme is validated
   and contrast-corrected. Course status `outline_ready`. Enqueues low-priority `cover` job (abstract SVG art).
2. Outline edits are plain CRUD. "Reshape" → `reshape_outline` job (only lessons not yet generated may change).
3. "Start learning" → course `active`; enqueue `lesson_plan` for lesson 1.
4. `lesson_plan` → sections `[{heading, goal, keyPoints[], interactiveIdea}]` → inserts section rows (`pending`) and
   enqueues one `section` job per section (priority by position).
5. `section` → blocks for that section, given the course, lesson plan and neighbouring section goals. Custom widget
   blocks are stored as `{type:'custom', brief, fallback, status:'pending'}` and enqueue a `widget` job.
6. `widget` → self-contained HTML/JS for a sandboxed iframe. Failure leaves the fallback in place.
7. Opening lesson *n* ensures *n* is generating and enqueues `lesson_plan` for *n+1* at lower priority.
8. "Steer" at the end of a lesson → `steer_outline` job: rewrites the not-yet-generated lessons after the current one.

### Data model (PostgreSQL)

- `users(id, email unique, password_hash, name, created_at)`
- `sessions(id = sha256(token), user_id, expires_at, created_at)`
- `settings(user_id pk, provider, lesson_model, chat_model, language, updated_at)`
- `courses(id, user_id, title, subtitle, topic_prompt, language, level, status, theme jsonb, cover_svg,
  is_example, is_published, error, created_at, updated_at)` — status: `outlining | outline_ready | active | failed`
- `lessons(id, course_id, position, title, summary, status, plan jsonb, error, progress real, completed_at, …)` —
  status: `planned | queued | generating | ready | failed`
- `sections(id, lesson_id, position, heading, goal, status, blocks jsonb, error, …)`
- `block_variants(id, section_id, block_id, kind, md, created_at)` — `simpler | deeper`
- `threads(id, user_id, lesson_id, section_id, block_id, variant_id null, anchor jsonb, created_at)`
- `messages(id, thread_id, role, content, created_at)`
- `quizzes(id, lesson_id, content jsonb, created_at)`
- `jobs(id, type, payload jsonb, status, priority, attempts, max_attempts, run_after, locked_until, error,
  created_at, updated_at)`

## 4. Lesson content model

All AI content is validated against zod schemas in `src/content/` (shared by server and client).

Text blocks: `paragraph{md}`, `heading{text}`, `callout{variant: insight|analogy|history|example|caution, title?, md}`,
`math{tex}`, `list{ordered, items[]}`, `quote{md, cite?}`, `code{lang, code}`.

Markdown in `md` is inline-plus: `**bold**`, `*italic*`, `` `code` ``, `[link](url)`, `$inline math$`, line breaks.

Widget library (the 80%):

| Widget | What the reader does |
|---|---|
| `diagram` | Sanitized AI SVG using theme CSS variables; optional steps reveal/highlight element ids |
| `scrolly` | Sticky SVG beside text steps; scrolling the steps changes what the diagram shows |
| `plot` | Sliders change parameters of mathjs expressions; curves redraw live |
| `chart` | Bar/line chart of real data with hover read-outs |
| `timeline` | Horizontal timeline; select an event to read about it |
| `formula` | KaTeX formula whose parts (`\htmlClass{p1}{…}`) explain themselves on hover/tap |
| `compare` | Side-by-side columns contrasting ideas |
| `cards` | Concept cards that flip to reveal an explanation (not a test) |
| `reveal` | "Pause and think" prompt with a gentle reveal |
| `steps` | A step-through sequence (Prev/Next) with optional SVG per step |
| `custom` | AI-written simulation (HTML/JS) in a sandboxed iframe, with a library fallback |

Every widget block has an `id` and optional `caption`. SVG is sanitized server-side with DOMPurify (SVG profile, no
scripts, no foreignObject, no external refs). Custom widgets run in `<iframe sandbox="allow-scripts">` (opaque
origin) with a strict CSP (`default-src 'none'; script-src 'unsafe-inline' <app>/widget-libs/; style-src
'unsafe-inline'; img-src data:`), receive theme variables through `postMessage`, and must post `ready` within 4 s or
the fallback is shown. Vendored libraries available to custom widgets: d3, three.

## 5. Themes

The outline step returns a theme:
`{name, mood, fontPair, scheme: light|dark, light{palette}, dark{palette}, texture, radius}` where
`palette = {bg, surface, text, muted, accent, accent2, highlight, border}`; `fontPair` ∈ editorial · classic ·
modern · humanist · technical · storybook (curated, self-hosted via `next/font`); `texture` ∈ none · grid · dots ·
paper · stars · waves; `radius` ∈ sharp · soft · round.

Server-side validation enforces contrast: text/bg ≥ 7:1 (adjusted toward black/white until it passes), muted/bg ≥
4.5:1, accent/bg ≥ 3:1. Course pages apply the theme through CSS variables; the reader follows the system colour
scheme by default, starting from the theme's preferred scheme, with a toggle. The app shell (home, settings) uses a
neutral minimal theme.

## 6. Ask-about-selection

- Selection inside reader content (paragraphs, callouts, list items, captions) shows a small floating "Ask" button
  (Floating UI). Clicking opens a popover: the quoted passage, an input with quick chips (Explain simply · Give an
  example · Why does this matter?), and the streaming answer (markdown + KaTeX). Follow-ups continue the thread.
- Anchor: `{blockId, variantId?, start, end, quote, prefix, suffix}` where offsets are into the block's text as
  rendered (KaTeX MathML text excluded). If offsets no longer match, re-anchor by searching `prefix+quote+suffix`,
  then `quote`.
- Highlights use the CSS Custom Highlight API (no DOM mutation, React-safe). Clicking text inside a highlighted range
  (hit-tested via `caretPositionFromPoint`/`caretRangeFromPoint`) reopens that thread.
- Answer context: course title, lesson title, the section's text, the quoted passage, and the thread history. Answers
  are short (≤ 180 words unless asked), match the course language, and may use inline math.

## 7. Security & operations

- Passwords: argon2id (`@node-rs/argon2`). Sessions: random 32-byte token in an `httpOnly`, `Secure` (in
  production), `SameSite=Lax` cookie; only its SHA-256 is stored. 30-day expiry.
- Mutating API routes verify the `Origin` header matches the app origin. Login attempts are rate-limited in memory.
- `middleware.ts` redirects unauthenticated page requests to `/login`; every route handler re-validates the session.
- CLI processes run with an empty scratch working directory, no tools (Claude) / read-only sandbox (Codex), and a
  minimal environment.
- Docker: multi-stage build on `node:22-bookworm-slim`, non-root UID 10010, read-only root filesystem with tmpfs
  `/tmp`, writable `/data/home` only, healthcheck `/api/health`, resource limits. Postgres on an internal network.
- VPS deployment (prepared, not executed): `apps/easy-learn/compose.yaml`, `data/easy-learn/{postgres,home}`, an
  internal `easy-learn-edge` network shared only with Caddy, an outbound network for the CLIs, a
  `sites/easy-learn.caddy` file for `learn.fuseservice.cloud`, versioned image tags in a private `.env`, and Fuse
  Manage registration. DNS: A record `learn` → `179.198.211.5`.

## 8. Error handling

- Jobs: up to 3 attempts with exponential backoff; final failure marks the course/lesson/section `failed` with a
  readable message and a Retry button in the UI.
- Provider not logged in / unavailable: surfaced as a banner with the exact login command for that provider.
- Invalid AI JSON: one repair round, then failure (above).
- Custom widget failure: fallback widget; never a broken page.
- Unknown block types from older data render nothing rather than crash (schema is versioned with `v: 1`).

## 9. Testing

- Vitest unit tests: content schemas, JSON extraction/repair, CLI output parsers (recorded JSONL fixtures), theme
  contrast correction, anchor computation/re-anchoring, job queue claim/retry logic (against Postgres), auth helpers.
- Playwright e2e with the mock provider: setup → login → create course → edit outline → start → lesson renders with
  widgets → select text → ask → highlight persists after reload.
- Manual: real generation with Codex CLI locally to tune prompts and to produce the example courses.

## 10. Out of scope (phase 1)

Signup, password reset email, public gallery, API-key providers, payments/allowances, mobile app, spaced repetition,
audio/TTS, collaborative features, analytics.
