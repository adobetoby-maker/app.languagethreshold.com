# CODEX_REVIEW_OF_CLAUDE - DUO-002

Reviewer: Codex
Date: 2026-07-27

Subject application commit: `e668022f5941d82b4acc54568d8604beea914b7b`
Claude documentation head observed during review: `af460ad`
Codex branch: `codex/usability-onboarding`
Shared baseline: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`

Scope: full Claude application state from `origin/main..e668022f5941d82b4acc54568d8604beea914b7b`.
Later Claude commits through `af460ad` were documentation only:
`CLAUDE_RESULT.md`, `CLAUDE_REVIEW_OF_CODEX.md`, and `SYNTHESIS.md`.

No merge was performed. No production change was made.

## Findings

### P2 - Mobile Match navigation was removed from the bottom bar but not added to More

`src/components/AppSidebar.tsx:373` says "Match moved out of this row - it lives
in the More sheet now," but the More sheet only renders `visible` tab items from
`TAB_ITEMS` (`src/components/AppSidebar.tsx:466` through `src/components/AppSidebar.tsx:505`).
The Language Match launcher is not a `TabKey`; it is the `onOpenMatch` overlay
action. In this commit, that action is still wired into the desktop sidebar at
`src/components/AppSidebar.tsx:275` through `src/components/AppSidebar.tsx:287`,
but there is no equivalent row in the mobile More sheet.

Language Match is still reachable indirectly through Games Hub
(`src/components/games/GamesHub.tsx:238` through `src/components/games/GamesHub.tsx:242`),
so this is not total feature loss. It is still a regression from the stated UX:
mobile users lose the direct Match entry point and must discover the Games Hub
path. Fix by adding a More-sheet action that calls `onOpenMatch`, or by keeping
a compact Match control in the bottom strip.

### P2 - Personalization wizard Back buttons still target the old three-step flow

Claude inserted language as step 1, making the wizard a four-step flow, but the
back targets were not renumbered. On the level screen, Back calls `setStep(1)`
at `src/components/onboarding/OnboardingWizard.tsx:257`, skipping the profession
step the learner just completed. On the summary screen, Back calls `setStep(2)`
at `src/components/onboarding/OnboardingWizard.tsx:290`, skipping the level step
the learner most likely wants to edit.

Fix: level Back should go to step 2, summary Back should go to step 3, and the
step comments should be updated so future edits do not preserve the stale
numbering.

### P3 - Saved-vocabulary confirmation renders two competing Flashcards CTAs

After `vocabAdded` becomes true, `WordCard` renders a new confirmation panel
with a "Practice in Flashcards" button at `src/components/reader/WordCard.tsx:437`
through `src/components/reader/WordCard.tsx:456`. It then immediately renders
the older "Study your saved words" button at `src/components/reader/WordCard.tsx:458`
through `src/components/reader/WordCard.tsx:468`.

Both controls do the same navigation. This is a low-risk UI duplication, but it
makes the Word Card feel less deliberate right after the key save action. Keep
the richer confirmation panel and remove the second button.

### P3 - `git diff --check` fails on new documentation trailing whitespace

`git diff --check origin/main..e668022f5941d82b4acc54568d8604beea914b7b` exits
non-zero because several new markdown artifacts contain trailing spaces:
`BUILD_STAGE_ARTIFACT.md:3`, `BUILD_STAGE_ARTIFACT.md:4`,
`BUILD_STAGE_ARTIFACT.md:5`, `BUILD_STAGE_ARTIFACT.md:6`, `CODEX_PLAN.md:5`,
`CODEX_PLAN.md:6`, `FINAL_HANDOFF.md:3`, `FINAL_HANDOFF.md:4`,
`FINAL_HANDOFF.md:5`, and `REPAIR_STAGE_ARTIFACT.md:3` through
`REPAIR_STAGE_ARTIFACT.md:10`.

This does not affect runtime behavior. It is worth cleaning because diff-check
is a common low-cost CI guard and should remain boring.

## Strengths To Preserve

- Language-first onboarding is the right product correction. It prevents the
  old Spanish-default path from leaking into Reader, Tutor, and saved-vocab
  behavior before the learner has made a choice.
- Docking Tutor into the bottom nav removes the mobile overlap class instead of
  continuing to tune offsets around a floating control.
- Reader-to-Word-Card-to-Tutor context is materially better: the source sentence,
  selected word, centered passage, and Word Card explanation are passed forward
  as structured context.
- Per-pane tap counting for the Reader hint is a better dismissal rule than a
  single accidental tap.
- The More Languages expander correctly separates shipped language support from
  roadmap languages that have no seeded passages yet.

## Hybrid Recommendations

- Keep Claude's language-first entry and docked Tutor, but restore the direct
  mobile Language Match action in the More sheet.
- Keep Claude's Reader/Tutor context plumbing where it complements Codex's
  stricter schema work. The hybrid should prefer an explicit validated context
  contract over implicit prompt assembly.
- Keep Codex's language-scoped vocabulary data model and tests over Claude's
  single-list `vocabLang` stamp. Claude's approach fixes the first save path but
  does not eliminate the class of cross-language hiding bugs.
- Retain Claude's mobile layout work only after the back-button and duplicate-CTA
  issues above are fixed.

## Verification

- `npm run build` passed in the Claude checkout after `origin/claude/usability-onboarding`
  advanced to `af460ad`. The application tree after `e668022f5941d82b4acc54568d8604beea914b7b`
  changed only in documentation files.
- `git diff --check origin/main..e668022f5941d82b4acc54568d8604beea914b7b`
  failed only on markdown trailing whitespace listed above.
- No runtime browser pass was performed by Codex for this review artifact.
