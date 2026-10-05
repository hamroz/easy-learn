# Easy Learn — Round 2: model routing, fonts, authoring from Claude Code

Date: 2026-10-05 · Status: approved direction (owner chose options in the design form; delegated the rest)

## 1. What the owner asked for

| Area | Decision |
|---|---|
| Logo | Candle flame mark + "Easy Learn" wordmark (Newsreader). Also the favicon. |
| Home input | More space between the input card and the suggestion chips; no focus rectangle on the textarea (the card's glow is the focus cue). |
| Lesson fonts | A catalogue of ~10 font combinations in Settings; the owner switches on the ones courses may use. Defaults on: Literata, Inter, IBM Plex Sans. |
| AI settings | Providers: Codex (subscription CLI), OpenCode (CLI, its own sign-ins), OpenRouter (API key). Claude hidden from Settings (code stays). |
| Model choice | Per-task model + effort, saved presets, optional fallback model per task. |
| Model library | The owner picks which models appear in pickers at all (OpenCode lists 468; OpenRouter hundreds). |
| Authoring | The owner can ask Claude Code (this assistant) to write a course; it is validated and imported into the platform over an authenticated API. |

## 2. Fonts

Catalogue (`src/content/fonts.ts`), id → heading/body stacks:

| id | Headings | Body |
|---|---|---|
| `literata` | Literata | Literata |
| `inter` | Inter Tight | Inter |
| `plex` | IBM Plex Sans | IBM Plex Sans |
| `newsreader-inter` | Newsreader | Inter |
| `source-serif` | Source Serif 4 | Source Serif 4 |
| `lora` | Lora | Lora |
| `fraunces` | Fraunces | Literata |
| `grotesk` | Space Grotesk | IBM Plex Sans |
| `newsreader` | Newsreader | Newsreader |
| `nunito` | Nunito | Nunito |

Old theme ids map forward: editorial→newsreader, classic→source-serif, modern→inter, humanist→fraunces,
technical→grotesk, storybook→nunito.

- `settings.fonts` = list of enabled ids (default `["literata","inter","plex"]`, never empty).
- Outline prompt lists only enabled ids with one-line descriptions.
- Rendering resolves `theme.fontPair` through the enabled list: if a course's font is no longer enabled, the first
  enabled font is used — so switching a font off changes existing courses immediately.
- Course menu gains "Font" to pick one of the enabled fonts for that course (stored in `theme.fontPair`).

## 3. Providers

| id | Kind | Invocation | Models | Effort |
|---|---|---|---|---|
| `codex-cli` | CLI, ChatGPT subscription | `codex exec --json … -m <model> -c model_reasoning_effort=<e>` | `codex debug models` (visibility=list) | per model from catalog |
| `opencode-cli` | CLI, OpenCode's own provider sign-ins | `opencode run --format json --pure -m <provider/model> [--variant <e>]` with an inline no-tools agent (`OPENCODE_CONFIG_CONTENT`) | `opencode models` | default · minimal · low · medium · high · max |
| `openrouter` | HTTPS API, owner's key | `POST https://openrouter.ai/api/v1/chat/completions` (stream) with `reasoning.effort` | `GET /api/v1/models` | default · low · medium · high |
| `claude-cli` | CLI (hidden in UI) | unchanged | — | — |
| `mock` | offline | unchanged | `mock` | — |

- Model catalogues are fetched server-side and cached 1 hour (`listModels()` on each provider); failures return
  an empty list with a message.
- The OpenRouter key is stored encrypted (AES-256-GCM, key derived from `APP_SECRET`) in `settings.secrets`; it is
  never returned to the browser (only "set / not set" and the last 4 characters).
- OpenCode in Docker: the image installs a pinned `opencode-ai`; the owner signs in inside the container
  (`docker compose exec -it web opencode providers login`). No host credentials are copied.

## 4. Model routing

Tasks (the routing keys): `course` (outline, reshape, steer), `cover`, `plan` (lesson plans), `writing` (sections),
`simulation` (custom widgets), `answer`, `rewrite`, `quiz`.

```ts
type ModelRef = { provider: ProviderId; model: string | null; effort: string | null };
type Route = { primary: ModelRef; fallback: ModelRef | null };
type Preset = { id: string; name: string; routes: Record<TaskKey, Route> };
type AiSettings = {
  library: Record<ProviderId, string[]>;   // models the owner enabled per provider
  presets: Preset[];                       // user presets
  activePresetId: string;                  // a user preset or a built-in id
};
```

- Built-in presets are computed from what is available: "Codex — balanced" (Codex default model, medium effort
  for writing/simulations, low for answers/rewrites/quizzes), and "Sample content" (mock). A user preset starts as
  a copy of the active one and is edited in a table: one row per task, primary model + effort, optional fallback.
- `aiFor(userId, task)` resolves the active preset's route. The generation path calls the primary; if it throws a
  `ProviderError` (other than `aborted`) or an `AIOutputError`, it retries the whole request once on the fallback.
- Legacy `settings.provider/lessonModel/chatModel` are migrated into an initial preset on first read.

## 5. Settings page

Sections: **Providers** (status + sign-in command / key field per provider) · **Model library** (per provider,
searchable list with toggles; Codex lists all its models enabled by default) · **Presets** (choose active, duplicate,
rename, delete; routing table with model pickers limited to the library) · **Fonts** (catalogue preview cards
with toggles) · **Authoring access** (personal access token) · **Example courses**.

## 6. Authoring from Claude Code

- Settings → "Create access token" shows a token once; only its SHA-256 is stored (`settings.authorTokenHash`).
- `POST /api/author/courses` with `Authorization: Bearer <token>` and a course document (the example-file format,
  version 1; lessons may have sections or be outline-only). Bearer requests skip the cookie Origin check. Returns
  `{ id, url }`. Outline-only lessons are generated later by the platform's own models.
- `scripts/validate-course.ts <file>` runs the same schemas and quality checks locally.
- A project skill `.claude/skills/write-course/SKILL.md` tells Claude Code how to write a course (style guide and
  block catalogue from `src/server/ai/prompts/style.ts`), validate it, and send it with `EASY_LEARN_URL` and
  `EASY_LEARN_TOKEN` from `.env.local`.

## 7. Testing

Unit: font resolution + legacy mapping; crypto round trip; OpenRouter/OpenCode parsers with recorded fixtures;
model catalogue parsing; route resolution + fallback; bearer import (auth, validation, ownership); settings API never
leaks the key. E2E: unchanged journey still passes. Manual: OpenCode + Codex runs with chosen models.

## 8. Out of scope

Ensembles (several models writing and judging), per-course routing, cost dashboards.
