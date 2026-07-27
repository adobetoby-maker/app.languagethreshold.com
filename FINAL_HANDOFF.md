# DUO-002 Final Handoff

Mission: `fb5416a6-7000-46b9-bea3-bce25c654c2c`  
Direction: Option A — Magic before map  
Builder/repair seat: `codex_hands`  
Status: workspace repair complete; independent rendered verification and founder selection pending

## Branch and external state

- Branch: `claude/usability-onboarding`
- Starting commit: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
- Current HEAD: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
- Ending commit: none; all task work remains uncommitted
- Preview URL: none
- Production deploy: none
- Integration branch: none
- `origin/main`: `8dff4f2 chore: verify auto-deploy after repo rename`
- Production and GitHub `main` remain unchanged.

The repository still carries both Cloudflare and Vercel paths. A1 deployment truth remains open, so
no preview deployment was attempted and neither configuration was changed.

## Outcome

- Reader-first entry and the existing A1 Spanish sample provide a no-account, no-upload trial.
- Word Card sends selected word, full sentence, centered passage, explanation, sentence index, and
  chapter index as structured Tutor context.
- Tutor context persists with the thread, clears with the conversation, and invalidates when the
  learner changes Reader book/chapter.
- Tutor FAB, MiniPlayer, and bottom navigation have separate bands and one shared scroll reserve.
- Tool purpose guidance is compact, dismissible, and persisted per tab; the catalog retains all 31
  purpose lines and existing module gates.
- Explicit profession choices again route to their specialty experiences; profession and level
  adjustment remain reachable later.
- The progress prompt waits until value, learner diagnostics are removed, and Grammar has honest
  staged wait/timeout/retry feedback.
- The review's contrast and passage-cap findings are repaired.
- `rosetta:check`, TypeScript, changed-file lint, and build now all exit `0`.

## Product decisions and compromises

- The existing `seed-es-travel-train-ticket` sample remains: available Spanish A1, short, neutral,
  and immediately tappable. A connected narrative may advertise the contextual loop better; that is
  a founder comparison decision under A3.
- Tutor source context uses the existing `lt.tutor.v1` local-storage key with backward-compatible
  migration. No account or database state changed.
- Lint is incremental to the feature-branch/working-tree surface; formatting is separate. Generated
  route/dictionary files remain type/build checked but are not sent through ESLint.
- Stripe's removed subscription-level period is read from the existing primary subscription item,
  matching the route's existing primary price behavior. No webhook or Supabase write was executed.

## Verification

| Check | Exact result |
| --- | --- |
| `npm run rosetta:check` | Exit `0`; 7 artifacts, no raw media, AI-gate and diagnostics invariants verified |
| `npx tsc --noEmit` | Exit `0`; no output |
| `npm run lint` | Exit `0`; 25 changed files, 0 errors, 5 existing warnings; ~0.8s |
| `npm run build` | Exit `0`; 2,584 client and 344 SSR modules transformed; Vercel v3 output created |
| `git diff --check` | Exit `0` |
| Built diagnostic scan | `0` matching files |
| Protected-file scan | `.remember/remember.md`, `src/lib/ai-gate.ts`, `wrangler.jsonc`, `vercel.json`, and `src/routeTree.gen.ts` unchanged |

No `test` script exists in `package.json`; no test suite is claimed.

## Runtime and accessibility evidence

The authorized local render remains blocked:

```text
npm run dev -- --host 127.0.0.1 --port 3000
Error: listen EPERM: operation not permitted 127.0.0.1:3000
```

No screenshots, real taps, payload captures, keyboard capture, timed runs, or recording are claimed.
Code/build evidence shows 44px targets, accessible names on repaired icon actions, separate floating
bands, one scroll reserve per real container, and AA-oriented saved-state colors. Final geometry,
theme integrity, and runtime accessibility remain unverified.

T1–T11 and T13–T20 remain UNVERIFIED at runtime. T12 passes source/build scans. T2b/V3 remains
UNVERIFIED by design pending a founder-authorized six-participant study. Acceptance criterion 19
remains unmet because no real recording exists.

## Files

New:

- `BUILD_STAGE_ARTIFACT.md`
- `CODEX_PLAN.md`
- `REPAIR_STAGE_ARTIFACT.md`
- `FINAL_HANDOFF.md`
- `marketing/reader-tutor-demo/{SCREENPLAY,SHOT_LIST,CAPTION_COPY}.md`
- `scripts/lint-changed.mjs`
- `scripts/rosetta-check.mjs`
- `src/components/onboarding/FirstRunEntry.tsx`
- `src/lib/learning-guidance.ts`

Modified product/configuration files:

- `eslint.config.js`
- `package.json`
- `src/components/SaveProgressBanner.tsx`
- `src/components/SubscriptionGate.tsx`
- `src/components/TabShell.tsx`
- `src/components/dictionary/types.ts`
- `src/components/grammar/LevelSidebar.tsx`
- `src/components/guide/AppGuide.tsx`
- `src/components/modules/{ModuleMatchPanel,ModulesPage}.tsx`
- `src/components/onboarding/{AppTour,OnboardingWizard}.tsx`
- `src/components/reader/{MiniPlayer,ParallelReader,WordCard}.tsx`
- `src/components/tab-registry.ts`
- `src/components/tutor/TutorPanel.tsx`
- `src/routes/api.stripe-webhook.ts`
- `src/routes/api.tutor.ts`
- `src/routes/index.tsx`
- `src/state/{library-state,tutor-state}.tsx`
- `src/styles.css`

Explicitly unchanged:

- `.remember/remember.md`
- `src/lib/ai-gate.ts`
- `src/routeTree.gen.ts`
- `wrangler.jsonc`
- `vercel.json`
- auth, pricing, Supabase schema, and database migrations

## What remains confusing or blocked

- A1 must resolve the comparable preview platform before deployment or rendered comparison.
- T2b/V3 needs separate moderated-study authorization.
- The demo recording needs a usable runtime and must stay outside git.
- The toolkit label/self-entry and sample narrative quality remain small founder-comparison questions.

## Highest-priority out-of-scope risk

Verified baseline from unchanged `src/lib/ai-gate.ts`:

```ts
export function checkGate(_isSubscribed: boolean): GateStatus {
  // DEMO MODE — AI gate disabled
  return "open";
}
```

Anonymous AI calls are uncapped while the counter still accrues. This pre-existing live cost exposure
requires a separate founder decision.

## Next reviewer focus

Render at `390×844`, `430×932`, and desktop in both themes; run Reader with audio; measure
true-bottom spacing; verify purpose dismissal, Tutor context lifecycle and payloads, Grammar
timeout/retry, personalization routing, My Vocab → Flashcards, and all 31 catalog routes with real
taps. Produce the real signature recording outside git once runtime access exists.

This handoff is comparison evidence, not approval. Only the independent verifier and Toby may accept
the result.
