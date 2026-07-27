# DUO-002 verification-unblock repair artifact

**Mission:** `0f81771b-2df6-47ad-9f2c-e9e2d227c885`  
**Stage / seat:** repair / `codex_hands`  
**Branch:** `codex/usability-onboarding`  
**Starting and current HEAD:** `8dff4f2b03f5e81a55894574e8ef3326d80d1116`  
**Frozen brief:** SHA-256 `adc8710e5bb4e9a8fb5f65806708fe8c73155b4ae7d00907560a38c63a33b57a`  
**Build contract:** SHA-256 `942ddf8cbb52b993c1f40a804f4b87ed31835c654288266350ab6fb4378f7446`  
**Cross-model review:** SHA-256 `ab70a1ca6ae3d9dfc100bf4152432370be8ff84212fc63716eb25a2f22bc8f5f`  
**Founder authorization receipt:** SHA-256 `2702f2776303b77c2885b30b3267ddbddabc832147a3ff93e0b84236dc5c0a2b`

## Authorized scope

This pass was limited to:

- adding the missing `rosetta:check` script;
- minimal behavior-preserving repairs for the recorded baseline TypeScript errors in dictionary,
  `SubscriptionGate`, and Stripe webhook code;
- narrowing repository lint scope and removing its performance blocker;
- attempting local visual evidence.

The earlier Reader-first implementation and unrelated workspace work were preserved. This repair
does not approve or certify the implementation.

## Repair disposition

| Recorded blocker | Disposition | Repair and evidence |
| --- | --- | --- |
| `npm run rosetta:check` missing | **Repaired** | `package.json` now exposes `test` and `rosetta:check`. The focused vocabulary suite was converted from Bun-only assertions to Node's built-in test runner, so the required command runs without a new dependency. |
| Dictionary TypeScript errors | **Repaired** | `VerbProfile.infinitiveEnding` now represents the generated dataset's actual `string \| null` values. Seven misspelled `infiniteEnding` keys were corrected in both the source JSON and generated TypeScript output so regeneration will not reintroduce them. No conjugation data was normalized or relabelled. |
| `SubscriptionGate` TypeScript errors | **Repaired** | Demo mode still returns children unconditionally. The dormant paywall implementation is isolated in a separate component so it remains type-checked without conditional hooks; module IDs receive an explicit string guard before record lookup. No pricing, auth, entitlement, or visible paywall behavior changed. |
| Stripe `current_period_end` error | **Repaired** | Stripe v22 places the current period end on subscription items. The existing profile field now reads `sub.items.data[0]?.current_period_end ?? null`, matching the adjacent first-item price lookup and retaining a null fallback. No webhook event, credential, database schema, or production data was changed. |
| Lint timeout after 300 seconds | **Repaired for execution** | Lint now targets source, scripts, tests, and configuration instead of outputs and prose. Prettier remains a separate formatter rather than an ESLint runtime rule. Explicit generated dictionary and route-tree files are ignored. Known legacy violations are warnings only in the exact files that already contain them; the same rules remain errors for new code elsewhere. Final lint completed in 3.56 seconds with 0 errors and 75 visible warnings. |
| Local visual evidence absent | **Not repaired; environment blocked** | Both permitted local serving paths failed with `listen EPERM` on `127.0.0.1`. The built SSR handler did return HTTP 200 and 66,543 bytes in memory, but the browser security policy rejected local/self-contained navigation. No screenshot, geometry, keyboard, real-tap, or AT-25 brightness claim is made. No deployment or alternate browser bypass was attempted. |

## Final validation receipt

| Command | Result | Exact evidence |
| --- | --- | --- |
| `npm run rosetta:check` | **exit 0** | 4 tests passed, 0 failed; final observed wall time 0.38 seconds. Covers case/whitespace deduplication, language separation, legacy migration without relabelling, and per-language merge/mastery preservation. |
| `npx tsc --noEmit` | **exit 0** | No diagnostics; final observed wall time 9.84 seconds. |
| `npm run lint` | **exit 0** | Completed in 3.56 seconds with 0 errors and 75 warnings. Warnings remain visible and are not represented as resolved debt. |
| `npm run build` | **exit 0** | Client, SSR, esbuild bundle, and local Vercel Build Output artifact completed in 10.18 seconds. Existing large-chunk, unused dependency import, and side-effect warnings remain. No deployment occurred. |
| `git diff --check` | **exit 0** | No whitespace errors. |

The successful checks prove that the repository can execute its required automated validation.
They do not prove AT-06 runtime continuity, AT-11 control geometry, AT-25 visual brightness, live
Tutor behavior, or the advertising flow.

## Files changed by this verification-unblock pass

- `package.json`
- `eslint.config.js`
- `tests/vocab-store.test.mjs`
- `src/components/SubscriptionGate.tsx`
- `src/components/climbing/GearPhotoMatch.tsx`
- `src/components/dictionary/types.ts`
- `src/components/dictionary/verbProfiles.ts`
- `scripts/lle-verb-profiles.json`
- `src/routes/api.stripe-webhook.ts`
- `REPAIR_REPORT.md`

`GearPhotoMatch.tsx` changed only by removing a stale Next.js-specific ESLint suppression from this
TanStack Start application.

## Evidence still required from the independent verification seat

1. Runtime Reader save matrix: empty, same-language, different-language, reload, returning-user,
   and remote merge; prove the word appears once in selected-language My Vocab and the same-language
   Flashcards deck.
2. Live `/api/tutor` request and response proving the selected sentence materially affects the
   answer and later unrelated questions do not reuse stale Reader context.
3. Maximum-scroll and keyboard-open measurements at 390×844, 430×932, and desktop.
4. Paired baseline/current cold-theme captures for entry, Reader, and Flashcards followed by
   independent contrast, maturity, hierarchy, and brightness judgment for AT-25.
5. Real-tap navigation, prompt persistence, Grammar timeout/error/retry, Games, Dashboard,
   accessible-name, touch-target, modal-fit, and browser-back checks.
6. A genuine 30–45 second Reader → Word Card → Tutor → save → practice recording in an approved
   artifact location.
7. Independent review of the 75 retained lint warnings; this pass deliberately did not broaden into
   unrelated behavior changes to clear them.

## Boundary receipt

No commit, merge, integration branch, push, preview deployment, production deployment, production
data mutation, database migration, pricing/auth rewrite, credential or permission change, external
communication, publication, spending, destructive action, or mission-state edit occurred.

GitHub `main` and Production were not changed by this repair seat. The workspace remains an
uncommitted comparison branch at the original baseline commit.

`REPAIR APPLIED — AUTOMATED CHECKS UNBLOCKED — INDEPENDENT VISUAL AND RUNTIME VERIFICATION REQUIRED`
