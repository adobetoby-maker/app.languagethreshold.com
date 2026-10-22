---
project: language-lens-elite
category: language-learning-app
deploy: vercel
lifecycle: active
last_verified: 2026-10-22
deployment_url: https://app.languagethreshold.com
supabase_project: pollhlkgltdkdskdzsgd
stripe_webhook_url: https://app.languagethreshold.com/api/stripe-webhook
---

# Language Threshold (language-lens-elite)

Multi-language learning platform: Core 60 trade modules, parallel reader, flashcards, grammar, speaking, Verb Games, matchmaking, leaderboard.

See `~/.claude/categories/language-learning-app.md` for shared patterns.
**CRITICAL DEVIATION: This is NOT Next.js. NOT Cloudflare Workers. It is Vite + TanStack Start deployed to Vercel.**

---

## Deviations from Category

- **TanStack Start** (React Router v7 + Vite) — NOT Next.js App Router; routes in `src/routes/`, server functions `src/routes/api.*.ts`
- **Deployed to Vercel** — `npm run deploy` (gated, `package.json:22`) or push `main`; never `wrangler`
- **Two tier systems** — XP tier (`src/state/app-state.tsx`) ≠ rank tier (`src/state/match-state.tsx`)
- **Lazy-proxy Supabase** — `import.meta.env.VITE_*` client-side, `process.env` fallback for SSR

---

## Before Touching

- Core lessons: read `docs/core60-architecture.md`, then `docs/reviews/2026-10-18-claude-core-handoff.md`.
- Verb Games: read `docs/verb-games.md` and `docs/superpowers/specs/2026-10-21-verb-game-modes.md`.
- Tabs: `src/components/tab-registry.ts` (TabKey exhaustiveness, ADR-0011) and `src/state/app-state.tsx`.
- Ticket history and rulings for Core 60: `/Users/drive/lt-worktrees/master/.foreman/core60-tickets.md`.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (auto-picks a port) |
| `node scripts/with-supabase-public-env.mjs npm run build` | production build; plain `npm run build` fails the client env check without the public key (`scripts/verify-client-env.mjs`) |
| `npm test` | `node --test tests/*.test.mjs` (294 files) |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / `scripts/lint-changed.mjs` |
| `npm run validate:core60 -- --strict` | every stage file + manifest + lesson content (`scripts/validate-core60.mts`) |
| `npm run smoke:e2e` | pre-push Playwright gate on a free port ≥ 3450 (`scripts/smoke-e2e.mjs`) |
| `npm run smoke:e2e -- --prod` and `-- --prod --phone` | prod smoke against app.languagethreshold.com; skips `@dev-only` specs |
| `node scripts/build-verb-patterns.mts --check` | exit 1 "verb patterns are stale" when `es.json` differs from a fresh compile |
| `npm run deploy` | `deploy:prod`: verify target → audit → test → typecheck → lint → build → `vercel deploy --prebuilt --prod` |

---

## Core 60 Architecture

Every module = **Foundation 10** (free with sign-in) + **Core 30** + **Master 20**; stages keep their own lesson numbers. Tab key is `core30`, shown as "Core 60" (`src/components/tab-registry.ts:194-197`, component `Core30Tab`). Catalog at c1e7434: 59 modules full 10/30/20 (T8).

| Piece | Path |
|---|---|
| Core 30 curricula (hand-written TS) | `src/data/curriculum.ts` (`CURRICULA`, line 3291) |
| Core 30 lesson content (passages, words, verbs) | `public/lesson-content/es/<module>.json` (57 modules) + `index.json` |
| Stage curricula (generated JSON, one lazy chunk each) | `src/data/core60/<es\|en>/<foundation\|master>-<base>.json` (112 es, 4 en) |
| Stage lesson content | `public/lesson-content/<es\|en>/<stage>-<base>.json` |
| Manifest — the only registration | `src/data/core60/manifest.ts` `CORE60_MANIFEST`, sorted by `base`; an unlisted stage shows "Coming soon" |
| Hand-written roofing stages (never generated, not in manifest) | `src/data/foundation-roofing-curriculum.ts`, `src/data/master-roofing-curriculum.ts` |
| Types, derive module from stage, lesson counts 10/20 | `src/lib/core60-stage-core.ts` (`CORE60_STAGE_LESSONS` line 21) |
| Validator | `src/lib/core60-validate.ts` (`validateStageFile`, `validateManifest`, `vosotrosForms`) |
| Registry + lazy loader behind `getCurriculum()` | `src/data/core60-stages.ts`; client hook `src/hooks/use-stage-curriculum.ts` (called in `src/components/TabShell.tsx`) |
| Core 60 path rows | `src/lib/core60-path.ts` (`core60Paths`) |

Manifest entries derive `foundation-<base>` / `master-<base>` MODULES, path steps, Say it missions and pace/gates by prefix. Stage chunks load on demand; every server reader calls `ensureStageForModule` first (`tests/core60-server-readers.test.mjs` scans for violations). Full detail: `docs/core60-architecture.md`.

---

## Adding a Module or Regenerating a Stage

Generator: `scripts/build-core60.mts` (prompts and checks in `src/lib/core60-generator-core.ts`). Flags (header lines 41-52):

| Flag | Meaning |
|---|---|
| `--module <id,...\|all>` | modules to write (required unless `--dry-run`) |
| `--stage foundation\|master` | one stage only (default both) |
| `--provider cli\|api` | default `cli` = Opus via the logged-in Claude CLI on the owner's subscription (`--model` default `claude-opus-5-5`); `api` bills `ANTHROPIC_API_KEY` |
| `--concurrency N` | parallel calls (default 2 cli, 6 api) |
| `--resume` | continue a stage with saved progress |
| `--force` | start the selected stages over (rewrites published stages) |
| `--dry-run` | print plan with token and dollar estimates; call nothing |

Pipeline order, every content ship (tickets T4b–T8): generate → `npm run validate:core60 -- --strict` → blind native-teacher review in category batches → ONE global fix pass applying every findings table → update test pins (`tests/speaking-missions.test.mjs` mission counts, core60 fixtures) → merge `main` → gates (`npm test`, typecheck, lint, build, `smoke:e2e`) → push `main` → `smoke:e2e -- --prod` and `-- --prod --phone`. Generator writes content, then stage file, then manifest LAST so a crash never points the manifest at a missing file.

---

## Content Rules (learned 2026-10-19 → 22)

| Rule | Reason | Where enforced / checked |
|---|---|---|
| Speaker lines are `"Name: sentence."`, no quotation marks or dialogue dashes | reviewers flagged it as a defect; ruled the required format (T6) | prompt `src/lib/core60-generator-core.ts:816` |
| Neutral Latin-American Spanish: `ustedes`, never `vosotros`/`os`/`-áis` | T7 ruling after 147 vosotros forms shipped in Masters | prompt `core60-generator-core.ts:286`; validator `core60-validate.ts:55-83` rejects stage files and passages (`generator-core.ts:1591-1597`); `grep -rl vosotros public/lesson-content/es src/data/core60/es` → 0 |
| Every emergency scene includes calling 911 | T6 systemic finding: lesson-10 emergencies missing the call | fix pass 7d85d66; check `grep -lE '911\|9-1-1' src/data/core60/es/foundation-*.json` |
| No allergy guarantees; allergy questions get answered | reviewers found guaranteed-safe dishes and unanswered questions (T5c, T6) | prompt `src/lib/lesson-content-prompt.ts:103`; guarantees removed in fix passes |
| Hazard scenes include the shut-off step (gas, fuel, power, saw) | T7 criticals: 11 safety blockers across trades/sports/travel | fix pass 7cf54ca; review rubric, not a validator |
| `haber` is never a five-form "there is" card; teach `hay` | T6 systemic: he/has/ha taught as "there is" | `grep '"infinitive": "haber"' public/lesson-content/es` → 0; `hay` handled as the only form (`src/lib/lesson-content-core.ts:656`) |
| "Hablo un poco de español", never "Hablo poco español" | "poco" without "un" means "hardly any" | `grep -rl 'Hablo poco español' public/lesson-content src/data/core60` → 0; `un poco de español` in 57 files |
| Notes state the final rule only (no "? No:", "wait", "actually") | model self-talk shipped in verb notes (T5c) | `selfTalkIssue` in `src/lib/lesson-content-core.ts:377-597`; `NOTE_FINAL_RULE` in `lesson-content-prompt.ts` |

---

## Verb Games

Spanish present-tense pattern games inside Games (`src/components/games/GamesHub.tsx:263` mounts `VerbsSection`). No runtime AI. Engine in `src/lib/verb-games/` (`rules.ts`, `scoring.ts`, `frames.ts`, `distractors.ts`, `bubble.ts`, `crush.ts`, `rng.ts`, `device.ts`, `route-guard.ts`, `load-patterns.ts`); UI in `src/components/games/verbs/`.

- **Signed data.** `src/data/verb-patterns/es.json` (712,497 B) compiled by `scripts/build-verb-patterns.mts` from `public/lesson-content/es/*.json`, dictionary profiles, overrides `docs/verb-patterns/es-overrides.json`, and the sign-off `docs/verb-patterns/es-review-signoff.json` (sha256 of `es-review-report.md`; signed 2026-10-21). A report change breaks the hash and drops classified verbs until re-signed. Size bound 750 KB: `tests/verb-data-size.test.mjs`. Run `--check` before committing any lesson-content, profile, compiler or sign-off change.
- **Compile scope.** Core 30 module files only. `foundation-*`/`master-*` stage files are skipped except the six already in the signed compile (`SIGNED_STAGE_FILES`, `scripts/build-verb-patterns.mts:37-48`). Ruling 2026-10-21 17:36: avoids re-signing on every content ship.
- **Modes.** `timed` (Bubble 60 s, Crush 90 s), `count` 5/10/15, `forever` (ends on first miss). `RoundConfig.mode` absent = timed so old logs replay identically. Non-timed and multi-family rounds get soft reason `"mode"` → unranked (`src/lib/verb-games/scoring.ts:51,264`). URL params `vfamilies`, `vmode` validated by `route-guard.ts`.
- **Leaderboards deferred.** The round seed is chosen client-side (`src/components/games/verbs/VerbsSection.tsx:35-107`; dev `?vseed=`). Public boards need a server-issued seed plus the `is_kid` auth fix before Tasks 17–21 ship.

---

## Env Vars (names only)

```
VITE_SUPABASE_URL  VITE_SUPABASE_PUBLISHABLE_KEY  VITE_SUPABASE_PROJECT_ID   # client-safe
SUPABASE_URL  SUPABASE_SERVICE_ROLE_KEY                                      # server-only
ANTHROPIC_API_KEY                                 # AI routes; generator --provider api only
STRIPE_SECRET_KEY  STRIPE_WEBHOOK_SECRET          # src/routes/api.stripe-webhook.ts
LT_EXAMS_PILOT_USER_IDS                           # comma list; src/lib/assessments/server.ts:44 pilotAllowed
DATABASE_URL  DIRECT_URL                          # Prisma (local only)
VITE_STRIPE_PRICE_MONTHLY|ANNUAL|FAMILY           # optional; pricing falls back to Payment Links
```

---

## Database (Supabase public)

| Table | Notes |
|---|---|
| `profiles` | `data` JSONB = full AppState + Stripe fields (`subscription_status`, `stripe_customer_id`, `period_end`, ...) written by `src/routes/api.stripe-webhook.ts` |
| `mission_pins`, `family_groups`, `family_members` | public read; max 7 members (DB trigger) |
| `library_books` | cloud-synced uploads; `learning_reset_id` added by `supabase/migrations/20261022013531_learner_learning_reset.sql` |

Migrations live in `supabase/migrations/`. **Never apply a migration to production; the owner does that.**

---

## Decision Defaults

| User says / context | Default action |
|---|---|
| "add a tab" | Dual update: `app-state.tsx` TabKey + `tab-registry.ts` TAB_COMPONENTS (ADR-0011) |
| "add a module" / "regenerate a stage" | `node scripts/build-core60.mts --module <id> [--stage x]` in background Bash, then the pipeline order above |
| "a stage is wrong in prod" | Remove its key from `src/data/core60/manifest.ts` (shows "Coming soon"); see "Taking a stage down" in `docs/core60-architecture.md` |
| "run the build" | `node scripts/with-supabase-public-env.mjs npm run build` |
| "deploy" | push `main` (Vercel auto-deploys) or `npm run deploy`; then `npm run smoke:e2e -- --prod` and `-- --prod --phone` |
| lesson content, profiles or compiler changed | `node scripts/build-verb-patterns.mts --check`; if stale, rebuild, re-sign if classified verbs changed |
| "add a verb game mode" | Extend `RoundMode` in `src/lib/verb-games/types.ts` + `scoring.ts` soft reason; keep absent-mode = timed |
| "public leaderboard" | Deferred: needs server-issued seed + `is_kid` fix first (Tasks 17–21) |
| long run (generation, e2e) in a Remote Control session | `Bash(run_in_background=True)`; NEVER `mcp__terminal__run_in_terminal` |
| "API route" | TanStack Start server function in `src/routes/api.<name>.ts` |
| "subscription not updating" | Check `profiles.data.subscription_status`; Stripe Dashboard → Webhooks deliveries |
| new e2e spec needs a signed-in learner | `seedAppState(page, { onboardingComplete: true, ... })` from `e2e/app-state.ts` + `localStorage.setItem("lt.languageChosen", "1")` (`e2e/verb-games.spec.ts:11-12`) |

---

## Operational Gotchas

- **Terminal panel prompts in Remote Control.** `mcp__terminal__run_in_terminal` always asks the owner regardless of bypass mode; a prompt stalled a loop 09:31→15:58 on 2026-10-21. Use background Bash; `dangerouslyDisableSandbox` only where the Claude CLI needs the Keychain.
- **Build needs the public key.** `npm run build` runs `scripts/verify-client-env.mjs` first; wrap with `node scripts/with-supabase-public-env.mjs` (fetches the key via `supabase projects api-keys`, in memory only).
- **E2E seeds** need `onboardingComplete: true` and `localStorage lt.languageChosen = "1"`; without them the page lands on onboarding instead of the tab under test (`e2e/verb-games.spec.ts:11-12`, `e2e/core60-path.spec.ts:52`).
- **Prod smoke** = `npm run smoke:e2e -- --prod` (desktop) and `-- --prod --phone`; `@dev-only` specs (fixture hook, unhashed chunks) are skipped there.
- **Merging the env-untrack commit** (fe21aff) deletes env files from other checkouts on pull; restore with `vercel env pull`.
- **Validator unlisted-file warning** is expected only for a stage deliberately taken down; otherwise add the manifest entry.

---

## Failure Patterns

- TabKey without TAB_COMPONENTS → runtime crash on tab click, no build error (ADR-0011)
- `src/start.ts` scanning request bodies for stage ids → unbounded memory on chunked requests (removed in T3c; every reader loads its own stage)
- Test pins hard-coding today's catalog (mission counts, module counts) → every manifest addition breaks the suite; compute from `CORE60_MANIFEST`
- Generator writing manifest before the stage file → manifest points at a missing file on crash
- Sonnet-generated Spanish shipped unreviewed → 2 gender blockers (T4c A/B); Opus + blind review is the standard
- `vosotros` in Spain-set travel scenes → leaked into 147 Master forms before the validator existed
- Verb compile including new stage files → sign-off hash breaks on every content ship
- `wrangler deploy` / `process.env` for Supabase keys client-side → wrong platform / undefined in Vite
- Stripe webhook 503 → `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` missing in Vercel

---

## Deferred Work

| Item | Where tracked |
|---|---|
| Verb Games Tasks 17–24: migration + score server + boards (17–21), Verb Cards deck (22), Send to Flashcards (23), pattern unit See/Hear/Recall (24) | `docs/superpowers/plans/2026-10-20-verb-games-phase1.md:890-1196` |
| Lazy verb-data load (es.json chunk fetched on Games open via `VerbsSection.tsx:136`, not on Verbs open) | ticket log 2026-10-21 17:24 |
| Server-issued round seeds (prerequisite for public boards) | PRD §11, `docs/superpowers/specs/2026-10-20-verb-games-prd.md` |
| Exam pilot-list step for demos: `LT_EXAMS_PILOT_USER_IDS` must list the demo user | `src/lib/assessments/server.ts:44`, `src/routes/api.exams.ts:392-691` |
| Learning-reset migration security finding (`20261022013531_learner_learning_reset.sql` trigger) | separate task; owner applies migrations |
| `is_kid` trust in `api.family-add-kid` before any public board | PRD §11 |

---

## Vocabulary

- "Core 60" = Foundation 10 + Core 30 + Master 20; tab key `core30`
- "Stage" = a Foundation or Master; "base" = the Core 30 module it extends
- "Signed" (verbs) = `es-review-signoff.json` hash matches `es-review-report.md`
- "Unranked" = round stored with a soft reason, never on a board
- "XP tier" ≠ "Rank tier" (app-state vs match-state)

---

## Output Contract

1. Files changed (path:line). 2. `npm run typecheck` zero new errors. 3. Content change → `validate:core60 -- --strict` output; verb inputs changed → `build-verb-patterns.mts --check` output. 4. Visual change → 4-viewport captures read. 5. State what was deferred; suggest the next step without taking it.

## Memory Triggers

- Project named without context → mem-search "language-lens-elite" / "Core 60" first.
- "like the T6 fix pass" / "the T7 ruling" → read `.foreman/core60-tickets.md` log before guessing.
