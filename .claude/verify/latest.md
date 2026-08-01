# Verification — DUO-003 grammar lesson flow

Branch: `integrate/duo-003-grammar-flow` · Integration commit `acb70b1c`
Base: `main` @ `8d8ae38` · Date: 2026-07-31

Scope: mobile stacked lesson view, history/back handling, completion panel,
canonical progression helper, quiz escape path.

| Dimension | Observed | Score /10 |
|---|---|---|
| Scale | Two component edits, one new 70-line pure helper, one new test file. Proportionate to a navigation fix. | 9 |
| Vision | One idea: a lesson is a place you go, not content appended below a list. Back, history and completion all follow from it. | 9 |
| Correctness | Mobile behaviour measured from the DOM, not inferred. Progression rules under test rather than asserted — including the last-in-array wraparound that would otherwise ship a false "level complete". | 8 |
| Relationship | Back control sits above the card so it survives loading, error, content and completion states alike; completion panel is gated on `isComplete` so a failed quiz cannot offer "Next". | 9 |
| Scope | Award/XP/badge logic untouched inside `QuizCard`. Desktop layout deliberately not redesigned. | 9 |
| Fit | Matches the list→focused-session pattern the app already ships in Flashcards, rather than inventing a new idiom. | 8 |
| Style | Comments record *why* — the off-fold stacking, the push-vs-replace reasoning, the non-perfect gating — not what the code does. | 8 |
| Direction | Correct order: make the lesson reachable and escapable before enriching it. | 9 |
| Mobile 375/390 | `g1-list.png`, `g2-lesson.png` read. Before: curriculum list with A1 expanded, six lessons. After tap: **list replaced**, `← BACK TO A1` above the card, skeleton + "Composing your lesson…". Measured: `A2 visible before=true / after=false`, history entry pushed, browser back returns to the list. | PASS |
| Desktop 1440 | `vp1440-0.png` read. Split view intact — CEFR sidebar left, lesson pane right. Mobile back control correctly **not** rendered. **Lesson-open path NOT exercised** — see below. | PARTIAL |
| 4K 2560 | Captured; sidebar present, mobile back hidden. Same lesson-open limitation. | PARTIAL |
| 5K 2560@2x | Captured; identical composition at 2× density. Same limitation. | PARTIAL |
| Footer visible | No scroll video. WAIVED: Grammar is a fixed-chrome tab with no scrolling page footer. | WAIVED |
| Outside input | Toby found the quiz-modal gap that both plans missed, and corrected a factual error in the Claude plan. Codex's cross-review corrected four defects. Both acted on, not filed. | PASS |

## Measured behaviour — mobile 390×844

| Check | Before | After |
|---|---|---|
| Tap a lesson | appended beneath the whole accordion, below the fold | **replaces the list** |
| `A2` row visible after tap | true (list still up) | **false** |
| Back affordance | none | `← BACK TO A1`, above every state |
| History entry | none | pushed |
| Browser/gesture back | exited the app | **returns to curriculum** |
| Page errors | — | none |

## Automated checks at `acb70b1c`

- `node --test`: **54/54 pass** — 10 new progression tests, including
  last-in-array-wraparound, display-order-independence, and safe fallback on an
  unknown lesson id.
- `npx tsc --noEmit`: **0 errors**.
- `npm run lint`: 2 errors, **both pre-existing** `no-useless-escape` at
  `QuizCard.tsx:55-56`. Confirmed by linting an unmodified HEAD copy of that
  file — an earlier `git stash` check wrongly suggested I had introduced them,
  because untracked files were not stashed and lint ran against a mixed tree.

## Not verified — stated plainly

1. **The desktop lesson-open path was not exercised.** Three attempts to click a
   lesson row in automation failed (text and DOM selectors both missed; the rows
   are not matched by the patterns tried). What *is* verified on desktop is that
   the sidebar renders and the mobile back control does not leak — but "split
   view survives opening a lesson" remains **reasoning from the `md:` gating,
   not evidence**. My first desktop run reported "split preserved after" and
   that reading was worthless, because the screenshot showed the right pane
   still reading "Choose a lesson to begin" — no lesson had opened. Recorded
   because the number looked like a pass and was not.
2. **The completion panel has never been rendered.** Reaching it requires
   passing a generated quiz perfectly against a live model. Its progression
   logic is covered by pure tests; the panel itself has not been seen. This is
   the same class of gap that produced the iter-16 failure, and it is the single
   most valuable thing for Codex QA to exercise.
3. **No Vercel Preview** exists for this branch yet.

## Gate question

**Would I show this to Toby right now without him asking? YES** for the mobile
fix, which is measured. The two unverified items are named above rather than
absorbed into a pass.
