# CLAUDE_REVIEW_OF_CODEX — DUO-003

Reviewer: Claude Code
Subject: `CODEX_PLAN.md` @ `c7bda75` on `codex/duo-003-grammar-flow`
Reviewer plan: `CLAUDE_PLAN.md` @ `5d16ef9` on `claude/duo-003-grammar-flow`
Date: 2026-07-31

Read read-only after both plans were marked `independent-complete`. Codex's
branch was not checked out, edited, or merged.

**Disclosure:** I am the other author. Where the plans compete I have stated the
case against my own first, because that is the only way this review is worth
anything.

---

## Verdict up front

**Codex's plan is better than mine and should be the basis for implementation.**
We converged on all four headline answers, but it worked out the consequences
further and caught four things that would have shipped as bugs in my version.

---

## Where we independently agree

Neither read the other. Convergence is evidence about the problem, not copying.

| Decision | Codex | Claude |
|---|---|---|
| Explicit next action, not timed auto-advance | ✅ | ✅ |
| Reason: protect the score/XP/badge feedback beat | ✅ | ✅ |
| Stacked view, not a sheet | ✅ | ✅ |
| Reason a sheet is wrong: long scrollable content, implies temporary | ✅ | ✅ |
| Not a separate app route | ✅ | ✅ |
| Desktop layout unchanged | ✅ | ✅ |
| `allDone` already exists and is merely unused | ✅ | ✅ |
| End-of-level offers the next level *by name*; C2 offers no fake next step | ✅ | ✅ |

That both of us rejected auto-advance for the same reason — it destroys the only
feedback moment in the surface — is the strongest signal in this task.

---

## Four defects in my plan that Codex caught

These are not stylistic preferences. Each would have been a real bug.

### 1. History must be *replaced* on Next lesson, not pushed

Codex: *"Advancing from one lesson to another should replace the current mobile
lesson history entry, not push another one. One Back action should return to the
curriculum, not walk backward through every lesson completed in the sitting."*

My plan said "push a history entry on lesson open" and stopped there. A learner
completing five lessons would need five back presses to escape Grammar. I
specified the mechanism and never traced its behaviour across a session.

### 2. A non-perfect quiz must not offer "Next lesson"

Codex: *"A non-perfect result … must not expose `Next lesson`, because the lesson
was not recorded complete."*

My completion panel offered Next / Review / Back without conditioning on the
result. Since `QuizCard` only records completion on a perfect score, my version
would have invited the learner past a lesson the system still considers
unfinished — corrupting the very `completed` map the next-step logic reads.

### 3. "Next incomplete" must follow canonical order, not display order

Codex: *"choose the next unfinished lesson in canonical `LevelState.lessons`
order … Do not use the module-focused display sort as curriculum order."*

I wrote "next incomplete lesson" without noticing that `LevelSidebar` re-sorts
lessons so module-relevant ones float to the top. My rule would have advanced
learners through a module-biased order while presenting it as curriculum
progression — non-deterministic and dependent on the active module.

### 4. Last-in-array is not the same as level-complete

Codex: *"If the current lesson happens to be last in the array but another lesson
in the level is incomplete, this is not a level milestone. `Next lesson` should
wrap."*

My end-of-level rule keyed off position. Anyone completing lessons out of order —
which the app permits — would have been shown "level complete" with unfinished
lessons behind them.

---

## Further strengths in Codex's plan

- **Search state on the existing `/` route** rather than my raw `pushState`.
  Survives reload, is inspectable, and keeps the URL truthful — while still
  avoiding the app-shell refactor a real `/grammar/...` route would force.
- **Clearing lesson search state when leaving Grammar**, so stale history cannot
  reopen a lesson under a different tab. I did not consider it.
- **Reload restoration gated on the lesson still existing for the selected
  language**, with a safe fallback. I did not consider reload at all.
- **Language change while a lesson is open** returns to that language's
  curriculum. I missed this entirely, and it is reachable from the bottom strip.
- **`FlashcardDecks.tsx:133-143` cited as existing precedent** for the
  list→focused-session pattern. I argued from architecture; grounding it in a
  pattern the app already ships is stronger and lowers the review burden.
- **Scroll reset and focus move to the lesson heading**, so the view change is
  perceivable without relying on animation — an accessibility answer to Toby's
  "not visible that it loaded," where I offered only a layout answer.
- **`prefers-reduced-motion`** on the transition.
- **A pure next-step derivation function with six named test cases**, including
  "module-focused display reordering does not alter canonical progression."
  My acceptance tests were behavioural only; a pure function is testable without
  a browser and is where the wraparound rules belong.

---

## Where I would still argue

Two points, offered as amendments rather than objections.

**1. The back-consistency cost should be stated explicitly.** My plan flagged
that Grammar becomes the only surface where browser back does anything, and that
a reviewer could reasonably demand "fix back everywhere or nowhere." Codex's
search-state approach is more consistent than my raw `pushState` — it lives on
the existing route — but the asymmetry remains and deserves a line in the record
so it is a decision rather than an accident.

**2. "Review this lesson" after a perfect quiz.** Codex offers Next lesson +
Back to Grammar on success. I would add a tertiary Review, since grammar is the
surface where a learner most often wants to re-read the explanation they just
tested on. Minor, and Codex's non-perfect path already covers the struggling
case with Try again / Continue anyway.

---

## Risks in Codex's plan

1. **`LevelSidebar` contract change.** Codex notes it "may need a controlled
   expanded-level value or a narrow ensure/select-first-lesson contract."
   `LevelSidebar` also owns timeout, retry, sorting and lesson generation. That
   is the highest-risk edit in the plan and warrants care during implementation.
2. **Search-state plumbing is broader than it looks** — push/replace semantics,
   clear-on-leave, reload validation and language-change handling are four
   distinct behaviours sharing one mechanism. They should be tested separately.
3. **Next-level loading** reuses the existing title-loading path, which is an AI
   call. The milestone's loading and failure states need to be as considered as
   the success state.

---

## Recommendation

Implement Codex's plan. Fold in the two amendments above if Toby agrees they are
worth the space.

If any of my plan is kept, it should be the explicit record of the
back-consistency tradeoff — not the mechanism, which Codex specified better.
