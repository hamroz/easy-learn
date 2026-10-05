# Easy Learn Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-owner, self-hosted web app that generates calm, themed, interactive courses with select-to-ask threads, powered by the owner's Codex/Claude CLI subscriptions, running locally in Docker.

**Architecture:** Next.js 16 App Router app with route handlers and an in-process Postgres-backed job runner; AI calls go through a provider interface that spawns the official `codex`/`claude` CLIs (or a mock). Lessons are validated JSON block documents rendered by a React widget library plus sandboxed custom widgets.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM + postgres-js, PostgreSQL 17, zod 4, KaTeX, mathjs, DOMPurify, Floating UI, motion, @node-rs/argon2, Vitest, Playwright, Docker.

**Spec:** `docs/superpowers/specs/2026-10-05-easy-learn-design.md`

## Global Constraints

- Only the unmodified `claude` binary via `claude -p`; never read/copy CLI credential files; no Agent SDK with subscription auth.
- Codex invocation: `codex exec --json --skip-git-repo-check --ephemeral --ignore-user-config --sandbox read-only -` (prompt on stdin).
- Claude invocation: `claude -p --output-format stream-json --verbose --include-partial-messages --tools "" --no-session-persistence --setting-sources "" --strict-mcp-config --disable-slash-commands --system-prompt <s>`.
- `AI_CONCURRENCY` default 2; generation timeout 6 min; interactive timeout 2 min; job max attempts 3.
- Every owned row carries `user_id` (directly or via course); courses carry `is_published`.
- Theme contrast: text/bg ≥ 7, muted/bg ≥ 4.5, accent/bg ≥ 3.
- Font pairs: editorial, classic, modern, humanist, technical, storybook. Textures: none, grid, dots, paper, stars, waves. Radius: sharp, soft, round.
- Session cookie `el_session`, httpOnly, SameSite=Lax, Secure in production, 30 days; DB stores SHA-256 only.
- Container runs as UID 10010, read-only root FS, writable `/data/home` and tmpfs `/tmp`.
- No quizzes unless requested. Lessons written in the request's language.

## Review Focus

1. AI returns malformed, truncated or schema-violating JSON (unknown block type, missing ids) → one repair round, then a visible failed state with Retry; never a crashed page.
2. CLI missing, not logged in, rate-limited or hanging → readable provider error with the exact login command; hung process killed at timeout; job retried.
3. Server restart mid-generation → leased jobs reclaimed after lease expiry and finished; no duplicate sections.
4. Selection spanning two blocks, inside KaTeX, or inside a widget → Ask is offered only for a selection within one text block; math is anchored atomically.
5. Non-Latin input (e.g., Russian topic) → outline, lessons and answers in that language; fonts fall back gracefully.

---

### Task 1: Scaffold, tooling, repo

**Files:** Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`, `compose.dev.yaml` (Postgres only), `src/app/layout.tsx`, `src/app/globals.css`.

- [ ] Step 1: `create-next-app` (TS, App Router, Tailwind, src dir, no ESLint prompt changes), add deps listed in Tech Stack.
- [ ] Step 2: `compose.dev.yaml` with `postgres:17-alpine` on `127.0.0.1:5433`; `.env.example` with `DATABASE_URL`, `APP_ORIGIN`, `SETUP_TOKEN`, `AI_PROVIDER`, `AI_CONCURRENCY`, `CLI_HOME`.
- [ ] Step 3: Verify `npm run build` and `npx vitest run` (zero tests) succeed.
- [ ] Step 4: `git init`, commit, create private GitHub repo `hamroz/easy-learn`, push.

### Task 2: Database schema

**Files:** Create: `src/server/db/schema.ts`, `src/server/db/client.ts`, `drizzle.config.ts`, `drizzle/` (generated), `src/server/db/migrate.ts`. Test: `tests/db/schema.test.ts`.

**Interfaces:** Produces: `db` (drizzle instance), tables `users, sessions, settings, courses, lessons, sections, blockVariants, threads, messages, quizzes, jobs` exactly as spec §3 Data model; `runMigrations(): Promise<void>`.

- [ ] Step 1: Test: inserting a user → course → lesson → section and cascading delete of the course removes lesson/section/threads.
- [ ] Step 2: Implement schema (uuid ids `defaultRandom()`, `onDelete: 'cascade'`), generate migration, `runMigrations` uses drizzle migrator.
- [ ] Step 3: Tests pass against dev Postgres (`TEST_DATABASE_URL`). Commit.

### Task 3: Content schemas and theme

**Files:** Create: `src/content/blocks.ts`, `src/content/theme.ts`, `src/content/outline.ts`, `src/content/color.ts`. Test: `tests/content/*.test.ts`.

**Interfaces:** Produces: `Block`, `blockSchema`, `sectionBlocksSchema`, `Theme`, `themeSchema`, `normalizeTheme(t: Theme): Theme`, `outlineSchema`, `lessonPlanSchema`, `quizSchema`, `contrastRatio(a: string, b: string): number`, `ensureContrast(fg, bg, min): string`.

- [ ] Step 1: Tests: every widget type from spec §4 parses; unknown type rejected by `blockSchema` but `parseBlocksLenient(raw)` drops unknown blocks and keeps the rest; `normalizeTheme` raises a low-contrast palette to ≥ 7 / 4.5 / 3; invalid hex replaced by defaults.
- [ ] Step 2: Implement. Commit.

### Task 4: AI providers and JSON generation

**Files:** Create: `src/server/ai/types.ts`, `src/server/ai/spawn.ts`, `src/server/ai/codex.ts`, `src/server/ai/claude.ts`, `src/server/ai/mock.ts`, `src/server/ai/json.ts`, `src/server/ai/index.ts`. Test: `tests/ai/*.test.ts` with fixtures `tests/fixtures/codex-*.jsonl`, `claude-*.jsonl`.

**Interfaces:** Produces: `AIProvider` (spec §3), `ProviderError{kind: 'not_logged_in'|'missing'|'timeout'|'rate_limited'|'failed', message}`, `parseCodexEvents(lines: string[]): {text?: string; error?: ProviderError}`, `parseClaudeEvent(line, onDelta)`, `extractJson(text: string): unknown`, `generateJson<T>(provider, schema: ZodType<T>, req): Promise<T>`, `getProvider(id?)`.

- [ ] Step 1: Tests: codex fixtures (success, model-unsupported error, turn.failed) parse correctly; claude fixtures (deltas concatenate, `authentication_failed` → `not_logged_in`); `extractJson` handles fenced, prefixed and trailing text; `generateJson` performs exactly one repair call on invalid output and throws after a second failure; spawn kills a process that exceeds timeout.
- [ ] Step 2: Implement. Commit.

### Task 5: Prompts

**Files:** Create: `src/server/ai/prompts/style.ts`, `outline.ts`, `lessonPlan.ts`, `section.ts`, `widget.ts`, `cover.ts`, `answer.ts`, `variant.ts`, `quiz.ts`, `steer.ts`. Test: `tests/ai/prompts.test.ts`.

**Interfaces:** Each exports `build<Name>Prompt(input): {system: string; prompt: string}`.

- [ ] Step 1: Test: prompts include the course language, the block type catalogue (all 11 widget types) for section prompts, and never ask for quizzes outside `quiz.ts`.
- [ ] Step 2: Implement with the spec §2 writing style. Commit.

### Task 6: Job queue, runner and handlers

**Files:** Create: `src/server/jobs/queue.ts`, `runner.ts`, `handlers/*.ts`, `src/instrumentation.ts`, `src/server/services/generation.ts`. Test: `tests/jobs/*.test.ts`.

**Interfaces:** Produces: `enqueue(type, payload, {priority?, runAfter?}): Promise<string>`, `claimNext(leaseMs): Promise<Job|null>`, `complete(id)`, `fail(id, err)` (backoff 2^attempt × 10 s, max 3), `startRunner()`; service functions `createCourse(userId, topic, level)`, `startCourse`, `ensureLessonGenerating(lessonId)`, `reshapeOutline`, `steerCourse`.

- [ ] Step 1: Tests: two concurrent `claimNext` never return the same job; expired lease is reclaimable; third failure marks job and target entity `failed`; with mock provider, `createCourse` → runner drains → course `outline_ready` with lessons; `startCourse` → lesson 1 sections all `ready`; custom block gets code or keeps fallback.
- [ ] Step 2: Implement. Commit.

### Task 7: Auth

**Files:** Create: `src/server/auth/*.ts`, `src/middleware.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/setup/page.tsx`, `src/app/api/auth/*/route.ts`. Test: `tests/auth/*.test.ts`.

**Interfaces:** Produces: `requireUser(): Promise<User>` (route handlers/server components), `assertSameOrigin(req)`, `createSession(userId)`, `destroySession()`.

- [ ] Step 1: Tests: setup rejected with wrong token and after first user exists; login rate limit after 10 failures/15 min per IP; wrong Origin → 403.
- [ ] Step 2: Implement. Commit.

### Task 8: API routes

**Files:** Create under `src/app/api/`: `courses/route.ts`, `courses/[id]/route.ts`, `courses/[id]/start`, `courses/[id]/reshape`, `courses/[id]/lessons` (CRUD on outline), `lessons/[id]/route.ts` (lesson + sections + variants + threads), `lessons/[id]/steer`, `lessons/[id]/quiz`, `lessons/[id]/progress`, `sections/[id]/retry`, `variants/route.ts`, `threads/route.ts`, `threads/[id]/messages/route.ts` (SSE), `settings/route.ts`, `health/route.ts`, `providers/health/route.ts`.

- [ ] Step 1: Tests (route handlers called directly with mock provider): unauthenticated → 401; creating thread + message streams `data:` chunks and persists assistant message.
- [ ] Step 2: Implement with zod-validated bodies. Commit.

### Task 9: App shell, home, settings, outline page

**Files:** `src/app/(app)/layout.tsx`, `page.tsx`, `settings/page.tsx`, `courses/[id]/page.tsx`, `src/components/ui/*`, `src/components/course/*`, `src/lib/fonts.ts`, `src/lib/themeStyle.ts`.

- [ ] Step 1: Implement; verify in browser with mock provider (create → outline → edit → reshape → start). Commit.

### Task 10: Reader and widget library

**Files:** `src/app/(app)/courses/[id]/lessons/[lessonId]/page.tsx`, `src/components/reader/*` (Reader, SectionView, BlockView, Markdown, Toc, ProgressBar, WhatNext, Quiz, ParagraphMenu), `src/components/widgets/*` (one file per widget + `CustomWidget` iframe + `public/widget-libs/`).

- [ ] Step 1: Tests (Vitest + Testing Library): every widget renders from a fixture without throwing; `plot` recomputes on slider change; `CustomWidget` shows fallback when no `ready` within 4 s.
- [ ] Step 2: Implement; verify with mock lesson containing every block type. Commit.

### Task 11: Select-to-ask, highlights, threads, variants

**Files:** `src/lib/anchors.ts`, `src/lib/highlights.ts`, `src/components/reader/AskPopover.tsx`, `SelectionToolbar.tsx`, `ThreadsDrawer.tsx`. Test: `tests/lib/anchors.test.ts`.

**Interfaces:** `textOffsetsFromRange(root: Element, range: Range): {start, end} | null`, `rangeFromOffsets(root, start, end): Range | null`, `reanchor(text, anchor): {start, end} | null`.

- [ ] Step 1: Tests: offsets round-trip across nested inline elements; KaTeX MathML excluded; `reanchor` finds moved quote via prefix/suffix; cross-block selection returns null.
- [ ] Step 2: Implement; e2e check: ask, close, reload, highlight present, click reopens. Commit.

### Task 12: Docker and deployment files

**Files:** `Dockerfile`, `.dockerignore`, `compose.yaml`, `docker/entrypoint.sh`, `deploy/vps/compose.yaml`, `deploy/vps/easy-learn.caddy`, `deploy/vps/README.md`, `README.md`.

- [ ] Step 1: Multi-stage build (deps → build → runtime with pinned `@openai/codex` and `claude` native binary verified against release manifest checksum per arch).
- [ ] Step 2: `docker compose up -d --wait`; `/api/health` 200; `docker compose exec web codex --version` and `claude --version` work as UID 10010. Commit.

### Task 13: End-to-end and real generation

**Files:** `playwright.config.ts`, `tests/e2e/flow.spec.ts`, `scripts/seed-examples.ts`.

- [ ] Step 1: Playwright flow from spec §9 against mock provider passes.
- [ ] Step 2: Generate a real course with Codex CLI; fix prompt/schema issues found; mark 3 courses as examples. Commit and push.
