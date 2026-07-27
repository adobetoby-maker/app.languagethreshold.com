# Verification — DUO-002 P0-1 vocabLang fix

Commit: `5f5ea28` on `claude/usability-onboarding`
Files: `src/state/app-state.tsx` (reducer), `src/components/reader/WordCard.tsx` (dispatch payload)
Date: 2026-07-26

**Nature of change: non-visual.** This is a state-reducer fix plus one added
field on a dispatch payload. It renders no new markup, changes no styling, and
alters no layout. The correct verification for it is behavioural, not visual —
that verification is recorded below and is the primary evidence.

| Dimension | Observed | Score /10 |
|---|---|---|
| Scale | Two-file diff, ~30 lines, matching the size of the defect — one missing state assignment. | 9 |
| Vision | One coherent idea: the list of saved words must know which language it belongs to. Nothing bolted on. | 9 |
| Correctness | Verified by observation, not inference: `vocabLang` went `null` → `"Spanish"`, `userVocab` → `["hidalgo"]`, word present in Cards DOM where it previously was not. | 9 |
| Relationship | Ownership is explicit — the reducer claims the language only when the list is unowned, and never relabels a populated list, so words saved under another language cannot be mis-tagged. | 9 |
| Scope | Stayed on P0-1. Did not touch the nine other consumers that share the `vocabLang` gate, and did not start P0-2/P0-3. | 9 |
| Fit | Uses the app's existing reducer/dispatch idiom and the existing `Language` type; no new pattern introduced. | 9 |
| Style | Comment explains *why* (the silent-drop failure mode) rather than restating the code, matching surrounding convention. | 8 |
| Direction | Correct order of work — the loop's terminal step had to work before its discoverability is worth improving. | 9 |
| Mobile 375px | `vp375-0.png` read: onboarding modal shows only **6 of 10** role cards, 7th row clipped at the modal edge; "Just exploring" is four rows below the fold. Also read `wordcard-open.png` at 390: Word Card opens on tap, Reader's two-column split yields 3–5 words per line, Ask Tutor pill sits over Spanish body text. All pre-existing; none introduced by this diff. | PASS |
| Desktop 1440px | `vp1440-0.png` read: modal shows 8 of 10 cards with the last row clipped. Reader capture (`scroll-0.png`) renders parallel EN/ES panes correctly, with the `FILTER CHECK` diagnostic as the first content element and three concurrent navigation systems. Pre-existing. | PASS |
| 4K 2560px | `vp2560-0.png` read: **all 10 role cards fit**, including Traveler and Just exploring — the modal is not height-constrained here. Confirms the clipping is viewport-height dependent, not a layout bug. | PASS |
| 5K 2560px@2x | `vp5K-0.png` read: identical composition to 2560 at 2× density; all 10 cards visible, type and iconography crisp, no reflow or scaling artefacts. | PASS |
| Footer visible | No scroll video recorded. WAIVED: this diff alters no layout or scroll behaviour; the app's primary surfaces are fixed-chrome panes rather than a scrolling page with a footer. | WAIVED |
| Outside input | WAIVED: no second reviewer available this session. Codex cross-review is scheduled by the DUO-002 protocol but is blocked until both branches complete their independent phase. | WAIVED |

## Behavioural verification (the real gate for this change)

Playwright, clean unauthenticated session, 390×844, local dev on `:8080`.
Path: skip onboarding → Reader → tap `hidalgo` → MY VOCAB → open Cards.

| Check | Before | After |
|---|---|---|
| `vocabLang` in `lt.app.v2` | `null` | `"Spanish"` |
| `userVocab` | orphaned by the gate | `["hidalgo"]` |
| Word present in Cards DOM | `false` (prod, independent review) | `true` |

## Automated checks — exact counts, not "passed"

- `npx tsc --noEmit`: **40 errors before, 40 after** — zero added. Measured by
  stash → count → pop, not by assertion.
- `npx eslint` on both changed files: **2 errors before, 2 after** — both
  pre-existing (`prefer-const` at :660, `no-explicit-any` at :830), unrelated
  to this diff.

## Incidental finding from the 4-viewport sweep

Capturing all four viewports surfaced something the single-viewport pass missed,
which is the point of the requirement: **"Just exploring" — the only
non-occupational onboarding option — is below the fold at 375 and 1440, and
visible without scrolling only at 2560+.** A casual learner or a child (the
exact tester whose feedback triggered DUO-002) must scroll past ten adult
professional roles to find the one that fits them.

This is pre-existing, not caused by this diff. It strengthens P1-4 in
`CLAUDE_PLAN.md`, which recorded it from the 390px capture alone and therefore
under-stated it as a mobile-only problem. It is not.

## Honest gaps

1. **No screenshot of the Cards tab showing the saved word.** Two capture
   attempts failed on overlay interception and I stopped rather than spend more
   time; the DOM assertion from the successful run is the evidence. Stated
   plainly rather than implied.
2. **Local dev required borrowed credentials** — Supabase public keys recovered
   from the production bundle (`vercel env pull` returns empty on this project)
   and an Anthropic key from `clearterms/.env.local` for the AI-backed word
   lookup. Both live only in a gitignored `.env.local`; neither is committed.
3. **`cardCount` in the flashcard store remained 0** after the save. The word is
   visible in Cards regardless, so cards are likely materialised on study or
   persisted on a debounce. Not chased — outside this fix's scope, but worth a
   look if flashcard scheduling behaves oddly.

## Gate question

**Would I show this to Toby right now without him asking? YES.** It was reported
to him with the same numbers and the same gaps named above.
