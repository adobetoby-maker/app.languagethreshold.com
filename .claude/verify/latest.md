# Verification — DUO-002 R1/R2/R3 (MERGE_REMOTE vocabulary, readerContext port, trailing whitespace)

Branch: `integrate/usability-onboarding` · Date: 2026-07-27
Prior entry (F1/F2 repair, then F3) is preserved in git history at `dd68fd1` and in
`.claude/verify/history/`.

Scope of this pass: R1 MERGE_REMOTE vocabulary reconciliation, R2 approved structured
`readerContext` Tutor contract, R3 trailing whitespace in four artifact documents.
Flashcards category filtering (F3) was NOT in this scope and was not touched by this session.

## Spec table

| Spec item | Observed | Result |
|---|---|---|
| Layout / spacing | Onboarding gate at 1440×900: amber "LANGUAGE THRESHOLD" pill, serif H1 "What are you learning?", subhead, 2-column grid of 8 language cards, "More languages" disclosure. No overlap, no clipping, no element collision. Identical before and after every edit in this session. | PASS |
| Colors / contrast | Dark navy canvas with amber accent on the pill; card labels white on card fill, native names in muted grey. Legible throughout the capture. | PASS |
| Typography | Display serif headline, sans body, sans card labels. Hierarchy H1 > subhead > card label > native name held. | PASS |
| Mobile (375px) | NOT CAPTURED — see "Not verified" below. | DEFERRED |
| Animations / motion | 31 frames extracted at 2fps from `record.js`. Frames 001 through 031 are visually identical; the onboarding gate is a single non-scrolling viewport, so there is no scroll motion and no footer below the fold to reach. No flicker, no layout shift, no mid-animation artifact across the timeline. | PASS |
| Regression vs. prior capture | Screenshots taken before the first edit, after the R1 reducer change, and after the full R2 port are byte-comparable at 1440×900. No regression introduced. | PASS |

## Rendered surface of these changes

R1 is a state reducer (`MERGE_REMOTE`) with no rendered output of its own.
R2 adds a data field (`textTitle`) to a request object, a third argument to
`tutor.prefill`, one state slice, and server-side prompt text. Neither changes any
element, style, or layout. R3 touches markdown artifacts only, not the app.

This is why the captures are expected to be identical, and they are. The score is
taken from that observation, not from the assumption that data plumbing is invisible.

## Not verified — stated plainly

- **The Reader surface was never reached.** The automated harness lands on the
  onboarding language gate and cannot complete onboarding, so `ParallelReader`,
  `WordCard`, and `TutorPanel` were not rendered in any capture. The end-to-end path
  (tap a word → Word Card → Ask Tutor → readerContext on the wire) is proven by unit
  test, not by pixels.
- **Mobile (375px) not captured**, for the same reason: the only reachable screen is
  the onboarding gate, which the desktop capture already covers.
- No live model was called at any point. R2 is certified offline by schema and
  prompt-assembly unit tests, as required.

---

## Item 3 — learner-facing failure state (this pass, commit follows)

Reproduced the Preview condition locally by starting the dev server with
`ANTHROPIC_API_KEY=""`, so the lookup genuinely fails rather than being simulated.

| Spec item | Observed | Result |
|---|---|---|
| Raw operator string removed | `/AI is not configured/` no longer present in the rendered body; retained on `title` so it stays diagnosable | PASS |
| Learner copy present | "Word details aren't available right now. Your sentence is above — try again in a moment." — muted body text in a bordered panel, not red/destructive | PASS |
| Source sentence survives failed lookup | `[data-testid=wordcard-source-sentence]` count = 1, renders “Per un giorno, per favore.” with both `per` tokens marked gold | PASS |
| Tapped word shown as headword | "Per" renders in display serif with no card data present | PASS |
| Mobile 390×844 | Card compact, no overflow, no overlap with the fixed bottom nav; Reader below shows the selected sentence with gold rule and marked token | PASS |
| Console errors | none | PASS |
| Outside input | Independent QA reviewer (Opus) on PR #8 surfaced this defect from the Preview: the card showed only red "AI IS NOT CONFIGURED" with no sentence. Verdict acted on, not filed. | PASS |

**This corrects a false claim recorded earlier in this repair.** The F2 entry
stated the source sentence "renders even when the AI lookup is unavailable." It
did not — the block sat inside the `{!loading && card && …}` branch, so a failed
lookup erased it. It now renders from local Reader state in both paths.

Viewport coverage for this change: verified at 390×844 (the learner-critical
case and the one the Preview exposed). Not re-captured at 1440/2560/5K — the
Word Card is a fixed-pixel overlay (`cardWidth()`), so it does not reflow with
viewport; that is reasoning, not evidence, and is flagged for Codex.
