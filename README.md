# Easy Learn

**Learn anything, calmly.** Type what you want to understand — *"the theory of relativity, I know nothing about
physics"* — and Easy Learn designs a course for you: an outline you can edit, a visual identity that fits the topic,
and long-form lessons with interactive widgets woven into the prose. Select any phrase to ask about it right there,
in a small popover; the passage stays highlighted so you can come back to the conversation later.

No streaks, no badges, no surprise quizzes. A quiz appears only when you ask for one.

## What it does

- **Course design** — an AI-written outline (5–9 lessons) you can reorder, rename, delete, extend or *reshape* in
  plain words ("less math, more intuition") before starting.
- **Per-topic design** — each course gets its own palette (light + dark), curated font pairing, background texture
  and an abstract SVG cover, contrast-checked server-side (text ≥ 7:1).
- **Explorable lessons** — sections are written in parallel and appear as they finish. Widgets include live function
  plots with sliders, step-through and scroll-driven diagrams, data charts, timelines, formulas whose symbols explain
  themselves, comparison panels, flip cards, "pause and think" reveals, step sequences — and bespoke simulations the
  AI codes on demand, run in a sandboxed iframe with a strict CSP and a library fallback.
- **Ask about anything** — select text → *Ask* / *Explain simply*; answers stream in a popover, follow-ups continue
  the thread, and highlights (CSS Custom Highlight API) reopen it on click. A "My questions" drawer lists them all.
- **Simpler / deeper** — rewrite any paragraph and switch between versions.
- **Steer the course** — at the end of each lesson, say where you want to go next and the upcoming lessons adapt.

## How it works

```
Browser ── Next.js 16 (App Router, React 19, TypeScript, Tailwind 4)
             │  route handlers (/api/*), server components, SSE for answers
             │  in-process job runner (Postgres queue: SKIP LOCKED, leases, retries, orphan reclaim)
             ├── PostgreSQL 17 via Drizzle ORM
             └── AI provider interface ── codex exec │ claude -p │ mock
```

- **Providers** run the official CLIs as child processes (`codex exec --json …`, `claude -p --output-format
  stream-json --tools "" …`) in an empty scratch directory, so the app uses the owner's own ChatGPT/Claude
  subscription. Output is parsed from JSONL, validated with zod, and repaired once if invalid. A mock provider
  powers tests and offline UI work. The interface is ready for API-key providers.
- **Generation pipeline** — `outline → cover`, then per lesson `lesson_plan → section × N → widget`. Opening a lesson
  prefetches the next one. Everything is retryable from the UI.
- **Content model** — lessons are typed block documents (`src/content/blocks.ts`); AI SVG is sanitised with
  DOMPurify; math is KaTeX; plots evaluate math.js expressions (no `eval`).
- **Security** — single owner account created with a one-time setup token; argon2id passwords; random session
  tokens stored only as SHA-256; Origin checks on writes; login rate limiting; non-root, read-only container.

## Running it

### Local development

```bash
docker compose -f compose.dev.yaml up -d --wait   # Postgres on :5433
cp .env.example .env.local                         # set AI_PROVIDER=mock to try it without AI
npm install
npm run dev
```

Open <http://localhost:3000/setup?token=YOUR_SETUP_TOKEN> to create the owner account. With `AI_PROVIDER=codex-cli`
or `claude-cli`, the app uses the CLIs already signed in on your machine.

### Docker (production-like)

```bash
cp .env.docker.example .env      # fill in POSTGRES_PASSWORD and SETUP_TOKEN
docker compose up -d --build --wait
docker compose exec -it web codex login --device-auth     # sign in with your ChatGPT account
docker compose exec -it web claude                        # then /login with your Claude account
```

Sign-ins persist in the `home` volume. See [`deploy/vps/README.md`](deploy/vps/README.md) for the VPS deployment.

### Tests

```bash
npm test            # Vitest: schemas, parsers, queue, pipeline, auth, API routes, widgets, anchors
npm run test:e2e    # Playwright: setup → course → lesson → ask → highlight persists
```

## Subscription use

Phase 1 is single-user by design. The app only invokes the unmodified `claude` binary signed in through
Anthropic's own login, never reads CLI credentials, and does not use the Agent SDK with subscription auth; only the
subscription owner uses it. Codex is used through the official CLI as OpenAI permits. A public, multi-user version
(phase 2) will use API keys (owner allowance + bring-your-own-key) instead.

## Project docs

- Design spec: [`docs/superpowers/specs/2026-10-05-easy-learn-design.md`](docs/superpowers/specs/2026-10-05-easy-learn-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-10-05-easy-learn-phase1.md`](docs/superpowers/plans/2026-10-05-easy-learn-phase1.md)
