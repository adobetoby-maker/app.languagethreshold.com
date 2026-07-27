# CODEX_RESULT - DUO-002 Rosetta checkpoint

Status: `independent-complete`

Agent: Codex

Branch: `codex/usability-onboarding`

Baseline and Production commit: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`

Verified implementation and preview head: `8e3c6b438c10f133be4d42d124b00f445a6dd03c`

Review PR: [#4](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/4)

GitHub currently reports PR #4 as open and ready for review, not draft. This
checkpoint uses the requested PR number but does not change its review state.

## Completion declaration

The independent Codex implementation is complete. This checkpoint changes
Rosetta documentation only; it does not modify application behavior. Runtime
certification remains incomplete where explicitly noted below.

## Checks run at the verified implementation head

| Check | Result |
| --- | --- |
| Rosetta preflight repository, remote, branch, local/upstream SHA, and `origin/main` checks | Aligned before documentation edits |
| `npm run rosetta:check` | Exit 0; 5 tests passed, 0 failed |
| `npx tsc --noEmit` | Exit 0; no diagnostics |
| `npm run lint` | Exit 0; 0 errors and 75 retained warnings |
| `npm run build` | Did not complete in this checkout; two attempts remained idle in `vite build` and were stopped |

The branch's existing `REPAIR_REPORT.md` records a successful production build
for the implementation before publication. This checkpoint does not replace
that evidence with a new success claim because the current local build attempts
did not finish.

## Vercel preview

- Status: `READY`
- Commit: `8e3c6b438c10f133be4d42d124b00f445a6dd03c`
- Preview:
  https://language-threshold-app-git-code-cd38a2-adobetoby-5572s-projects.vercel.app
- Vercel deployment record:
  https://vercel.com/adobetoby-5572s-projects/language-threshold-app/DmRNArKfaS1Y7RbcaLwkShQrLTWR
- Alignment evidence: GitHub's successful `Vercel` status and edited Vercel PR
  comment are both attached to the exact commit above.

## Unresolved API limitation

A live sentence-aware Tutor response and stale-context expiry were not certified
in this checkpoint. Those flows require a working `ANTHROPIC_API_KEY`; no
dedicated Language Threshold credential was available for local verification.
The READY deployment proves that the preview built for the recorded SHA, not
that every AI-backed request was exercised or that preview secret configuration
was independently confirmed.

## Track A verification

Track A was inspected read-only from `origin/claude/usability-onboarding`.
Claude's branch was not checked out or edited.

- PR #3 current head:
  `43de363bfee68ce239363394ba5f790cdf14981e`
- PR #3 aligned READY preview:
  https://language-threshold-app-git-clau-55c225-adobetoby-5572s-projects.vercel.app
- Track A Vercel deployment record:
  https://vercel.com/adobetoby-5572s-projects/language-threshold-app/9TU1i1VRKTU2mxaPnFv6hwAr5wcs
- `CLAUDE_RESULT.md` reports head `8dc1400`, not the current PR head.
- `CLAUDE_RESULT.md` does not report the current aligned READY preview.

Result: **mismatch**. GitHub has a READY preview aligned to Track A's current
head, but Track A's result document is stale and does not record either current
value.

## Boundaries

- No application behavior changed in this checkpoint.
- No Claude branch file was edited.
- PR #4 was not merged.
- Production was not deployed.
- `main` and Production remain at
  `8dff4f2b03f5e81a55894574e8ef3326d80d1116`.

## 2026-07-27 localhost runtime review

This was a read-only application review at `http://localhost:8080` with a
`390x844` mobile viewport. The only repository change is this evidence update.
Temporary browser-local vocabulary state was removed after verification.

### Commit comparison

- Running checkout branch: `claude/usability-onboarding`
- Running checkout commit:
  `90417cbb10d06c4ea50bea8572106b9a25ef9d40`
- Current GitHub PR #3 head:
  `90417cbb10d06c4ea50bea8572106b9a25ef9d40`
- PR #4 branch head at review start:
  `8acd101549383a14bd1adde20d8a9af523e8232b`

Result: the localhost build exactly matches Track A / PR #3. It does **not**
match `codex/usability-onboarding` or PR #4, so this review is runtime evidence
for commit `90417cbb10d06c4ea50bea8572106b9a25ef9d40`, not runtime certification of
PR #4's application commit.

### Workflow results

| Review step | Result |
| --- | --- |
| Mobile onboarding | Passed. Language selection, Italian selection, first-run value proposition, `Start reading`, and Reader entry were usable at `390x844`. |
| `Dove abiti?` | Partial. Sentence segmentation was correct and tapping `abiti?` produced lemma `abitare` with sentence-aware grammar, but the Word Card displayed the generated example `Abiti vicino al parco?` instead of the exact Reader sentence. |
| `prenotazione` | Partial. Sentence segmentation, definition, and grammar were correct, but the Word Card displayed `Ho una prenotazione al ristorante per le otto di sera.` instead of the exact Reader sentence `Ho una prenotazione.` |
| Ask Tutor context | Passed. The Tutor showed `Context from Reader - sentence 2`, selected word `prenotazione`, and exact source sentence `Ho una prenotazione.` The prefilled question also preserved that exact context. |
| Live Tutor response | Passed on the running build. The API returned a sentence-aware explanation of `Ho una prenotazione`, including `Ho + [noun]`, feminine article agreement, and usage examples. |
| Save word | Passed. `My Vocab` changed to `Added` and confirmed `Saved to My Vocab` plus readiness in Flashcards. |
| Flashcards | Passed with a caveat. The full deck contained `prenotazione`, its definition, due status, and a remove control. The `Vocab (your words) 1/1` toggle did not isolate the custom card; activating it changed the deck from 95 to 94 cards and left core cards visible. |

### Dock and mobile layout

- Exactly one visible `Ask Tutor` control was present.
- The control was inside the fixed bottom navigation.
- Tutor bounds were `x=341.28125`, `y=788.5`, `width=48.71875`,
  `height=55.5` in a `390x844` viewport.
- Bottom navigation bounds were `x=0`, `y=741.5`, `width=390`,
  `height=102.5`.
- The Tutor control had zero overlap with sibling navigation controls.
- No separate floating Tutor button was present.
- A secondary mobile issue was observed after onboarding: the Reader Library
  drawer appeared horizontally clipped on the left at this viewport.

### Console and boundaries

The browser emitted no runtime errors during the review. One TanStack Router
warning reported that `PricingPage` exported from `src/routes/pricing.tsx`
would not be code-split.

- No application source was edited.
- No branch was merged.
- No manual preview or Production deployment was initiated.
- Production remains unchanged at
  `8dff4f2b03f5e81a55894574e8ef3326d80d1116`.
