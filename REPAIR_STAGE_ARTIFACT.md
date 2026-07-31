# Atlas Duo Repair Stage Artifact

- Mission: `fb5416a6-7000-46b9-bea3-bce25c654c2c`
- Task: `DUO-002` / `LT-20260726-usability-onboarding`
- Stage: `repair`
- Hands seat: `codex_hands` (`gpt-5.6-sol`)
- Independent reviewer: `opus`
- Workspace: `/Users/drive/git-backups/lt-duo-002-20260726-164150/claude`
- Branch: `claude/usability-onboarding`
- Baseline/current HEAD: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
- Result: approved repairs are present and the deterministic verification blockers are cleared; rendered verification remains unavailable and this builder does not approve its own work.

## Authority and provenance

Founder authorization covered:

- valid findings in the recorded cross-model review;
- a new `rosetta:check` script;
- minimal behavior-preserving fixes for the recorded TypeScript errors in dictionary types,
  `SubscriptionGate`, and the Stripe webhook;
- lint scope/performance;
- local visual evidence.

No commit, push, merge, integration branch, preview deploy, production deploy, production data
mutation, credential/permission change, participant recruitment, recording publication, or other
external write occurred.

The installed Atlas Duo CLI could not resolve this mission in its local registry:

```text
error: Missing file: /Users/drive/git-backups/dual-cofounder-harness/.cofounder/missions/fb5416a6-7000-46b9-bea3-bce25c654c2c/mission.json
```

The supplied mission envelope, approved build specification, cross-model review, founder
authorization, and archived failed-verification receipt were therefore the governance sources.
No mission state, governance, approval, receipt, or acceptance criterion was edited.

Artifact integrity caveat:

| Artifact | Envelope SHA-256 | Observed SHA-256 |
| --- | --- | --- |
| Approved build specification | `e906d19c6b68bf4faf1e50439530798332d36be9657adf964b8f941aabed853c` | `fc46ade58af977ea6594044f3e8332a60984f20268b9b4da9402708e75b3f1d9` |
| Cross-model review | `1ea450798edad8d0677a440dfc76e12e476e421988483c50995573b6c7c241bc` | `0ba7d78e7065e874f5985acdedeaa2b384e0deb276c068ac65e20a7725789b88` |

The observed documents' headings and substantive content match the supplied summaries. The
mismatch is disclosed rather than treated as proof of artifact immutability; neither external file
was changed by this seat.

## Cross-model finding disposition

| Finding | Disposition | Repair evidence |
| --- | --- | --- |
| F1 — Tutor FAB/MiniPlayer collision | Repaired | Separate `lt-tutor-above-nav` and `lt-miniplayer-above-nav` vertical bands |
| F2 — duplicated safe padding | Repaired | `TabShell` owns neither `lt-scroll-safe` nor `min-h-full`; real scroll containers reserve the bottom strip once |
| F3 — permanent purpose chrome | Repaired | Compact first-visit prompt, dismissible per tab and persisted in local storage |
| F4 — stale/unpersisted Tutor context | Repaired | Context persists with threads, clears with `CLEAR_THREAD`, and invalidates on Reader book/chapter movement |
| F5 — specialty routing removed | Repaired | Missionary routes to Discussions, supported professions to Field Prep, generic/skip to Reader |
| F6 — CEFR selection unreachable | Repaired | Complete Toolkit exposes profession/level adjustment even with an active module |
| F7 — handoff/evidence gaps | Partially repaired | Scratch file restored; handoff and verbatim AI-gate disclosure added. Preview, recording, and rendered evidence remain unavailable |
| F8 — low-contrast saved state | Repaired | `emerald-700` light / `emerald-300` dark |
| F9 — unsupported Grammar promise | Repaired | Honest final wait stage: `Almost ready…` |
| F10 — centered passage can exceed API cap | Repaired | Whole-sentence centered builder capped at 2,000 characters |
| F11 — sample preference | Not accepted as a required repair | A3 explicitly leaves sample taste to implementer judgment; the compliant A1 train-ticket sample remains a founder comparison point |
| F12 — catalog/copy taste | Not accepted as a required repair | No acceptance or correctness failure was demonstrated; recorded for founder comparison |

## Failed-verification repair

### Rosetta check

Added `scripts/rosetta-check.mjs` and the `rosetta:check` package script. It deterministically checks:

- seven required mission/build/handoff/demo documents and required markers;
- unresolved merge markers in those artifacts;
- absence of raw demo media from the repository;
- preservation of the approved demo-mode `ai-gate.ts` baseline;
- absence of learner-facing filter diagnostic language from source.

Exact result:

```text
> rosetta:check
> node scripts/rosetta-check.mjs

Rosetta check passed: 7 required artifacts verified.
No raw reader-tutor demo media is present in the repository.
Protected AI-gate baseline and learner-diagnostic invariants verified.
```

Exit: `0`.

### TypeScript baseline fixes

- `src/components/dictionary/types.ts`: the type now reflects the generated source data's real
  language-specific ending strings, nullable values, and legacy `infiniteEnding` spelling.
  Generated dictionary payloads were not rewritten, so runtime behavior is unchanged.
- `src/components/SubscriptionGate.tsx`: restored the existing `currentTab` binding and made the
  nullable module identifier safe before indexing. The demo-mode early return remains unchanged.
- `src/routes/api.stripe-webhook.ts`: Stripe API `2025-03-31.basil` and later moved billing periods
  from `Subscription` to `SubscriptionItem`; the existing single-price profile behavior now reads
  `items.data[0].current_period_end`, alongside the already-primary price ID
  ([Stripe change record](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end)).
  No webhook was invoked and no Supabase data was read or written.

Exact result:

```text
npx tsc --noEmit
```

Exit: `0`; no output.

### Lint scope and performance

`npm run lint` now runs `scripts/lint-changed.mjs`, which scans changed JavaScript/TypeScript files
from the working tree, index, untracked set, and feature-branch diff against `origin/main`.
Formatting remains the separate `npm run format` concern. Generated route/dictionary payloads are
excluded from ESLint but remain covered by TypeScript and the production build.

Exact result:

```text
> lint
> node scripts/lint-changed.mjs

Linting 25 changed JavaScript/TypeScript files.
✖ 5 problems (0 errors, 5 warnings)
```

Exit: `0`; elapsed approximately `0.8s`. The five warnings are existing Fast Refresh/provider
warnings in `library-state.tsx` and `tutor-state.tsx`, plus one stale suppression warning in
`library-state.tsx`. No lint error remains.

## Deterministic validation

| Check | Result |
| --- | --- |
| `npm run rosetta:check` | Exit `0` |
| `npx tsc --noEmit` | Exit `0`; no output |
| `npm run lint` | Exit `0`; 0 errors, 5 warnings; ~0.8s |
| `npm run build` | Exit `0`; 2,584 client and 344 SSR modules transformed; Vercel Build Output API v3 artifact created |
| `git diff --check` | Exit `0` |
| Built diagnostic scan | `0` files matched `Filter check`, `filter inactive`, or `No active module` in `dist` / `.vercel/output` |
| Raw demo media scan | `0` non-Markdown files under `marketing/reader-tutor-demo` |
| `.remember/remember.md` diff | Exit `0`; unchanged from HEAD |
| `src/lib/ai-gate.ts` diff | Exit `0`; unchanged from HEAD |
| Deployment configs/generated route diff | Exit `0`; `wrangler.jsonc`, `vercel.json`, and `src/routeTree.gen.ts` unchanged |

Build warnings remain non-fatal and pre-existing: large generated chunks, unused imports in upstream
TanStack packages, and six displayed esbuild side-effect warnings out of 656.

## Rendered verification

Local server attempt:

```text
npm run dev -- --host 127.0.0.1 --port 3000

error when starting dev server:
Error: listen EPERM: operation not permitted 127.0.0.1:3000
```

The browser surface was available, but without an allowed local listener it had no route to the
uncommitted app. It was opened only to inspect that capability and left with no tabs. No preview or
production deployment was authorized, and production screenshots would not prove the repaired
workspace.

Therefore the requested `390×844`, `430×932`, desktop, and Reader → Word Card → Tutor visual
artifacts do not exist. F1–F3 remain code/build-verified but not pixel-verified. No screenshot,
real-coordinate-tap transcript, keyboard capture, true-bottom capture, request-payload capture,
timed entry run, or advertising recording is claimed.

Runtime status:

| Acceptance group | Status |
| --- | --- |
| T1–T11 | UNVERIFIED at runtime; source repairs present |
| T12 | Source and built-artifact scans pass; runtime unverified |
| T13–T20 | UNVERIFIED at runtime; source repairs present where applicable |
| T2b / V3 | UNVERIFIED by design; six-person moderated study still needs founder authorization |
| Acceptance criterion 19 | Unmet; demo documents exist but no real recording exists |

## Files added in the verification-unblock pass

- `scripts/lint-changed.mjs`
- `scripts/rosetta-check.mjs`

## Files modified in the verification-unblock pass

- `eslint.config.js`
- `package.json`
- `src/components/SubscriptionGate.tsx`
- `src/components/dictionary/types.ts`
- `src/routes/api.stripe-webhook.ts`
- `FINAL_HANDOFF.md`
- `REPAIR_STAGE_ARTIFACT.md`

All previously repaired product files and unrelated user work were preserved.

## External-state evidence and remaining decisions

```text
branch: claude/usability-onboarding
starting/current HEAD: 8dff4f2b03f5e81a55894574e8ef3326d80d1116
ending commit: none; work remains uncommitted
origin/main: 8dff4f2 chore: verify auto-deploy after repo rename
integration branch: none
preview URL: none
production deploy: none
```

Still open:

- A1: Toby/DUO-001 must identify whether Vercel or Cloudflare is the comparable preview path.
- A5/A6/A7/A9 remain as recorded in the approved contract.
- T2b/V3 needs a founder-authorized moderated six-participant study.
- The required advertising recording needs a usable local/preview runtime and must remain outside git.
- The A1-compliant train-ticket sample may be less expressive for advertising than a short connected
  narrative; this remains a founder comparison decision, not a repair failure.

Highest-priority out-of-scope risk, quoted verbatim from unchanged `src/lib/ai-gate.ts`:

```ts
export function checkGate(_isSubscribed: boolean): GateStatus {
  // DEMO MODE — AI gate disabled
  return "open";
}
```

Anonymous AI calls are uncapped while `incrementCallCount()` still accrues. This live cost exposure
predates DUO-002 and requires a separate founder decision.

## Next independent action

An independent verifier should:

1. rerun the four deterministic checks;
2. obtain an approved local or same-platform preview path;
3. render at `390×844`, `430×932`, and desktop in both themes;
4. verify Reader with audio active, true-bottom spacing, purpose dismissal, Grammar timeout/retry,
   specialty routing, and all 31 catalog routes with real taps;
5. capture first-turn, follow-up, reload, chapter-change, and clear-thread Tutor behavior;
6. produce the real Reader → Word Card → Tutor → save → practice recording outside git.

This artifact records the repair and its evidence. It does not certify, approve, merge, or deploy it.
