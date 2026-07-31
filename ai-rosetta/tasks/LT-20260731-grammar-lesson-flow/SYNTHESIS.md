# SYNTHESIS — DUO-003 Grammar lesson flow

Decision owner: Toby Anderton
Date: 2026-07-31
Status: **approved for implementation**

Inputs, both `independent-complete` and both still draft:

| Agent | PR | Plan commit |
|---|---|---|
| Claude Code | [#11](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/11) | `5d16ef9` |
| Codex GPT-5.6 Sol | [#10](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/10) | `c7bda75` |

Baseline: `main` @ `8d8ae38`

---

## Strong agreement — reached independently

Neither agent read the other before publishing. These are convergent, not copied:

- Explicit `Next lesson`; **no** timed auto-advance
- Mobile stacked view; **not** a route, **not** a sheet
- Real browser-history support for returning to the curriculum
- No desktop layout redesign
- Next **incomplete** lesson rather than blindly advancing
- A **named** next-level action after level completion
- No fabricated next step after C2
- Quiz, XP, badges, completion records and lesson generation all unchanged

---

## Meaningful differences

| Area | Claude | Codex |
|---|---|---|
| History | Raw `pushState`/`popstate` | Validated URL search state |
| Consecutive lessons | Not specified | **Replace** history so Back returns directly to curriculum |
| Successful result | Next, Review, Back | Next and Back, plus a separate level milestone |
| End of level | Direct `Start A2` action | Dedicated level-complete screen, then opt into A2 |
| Progression order | Next incomplete | **Canonical** lesson order, wrapping to earlier incomplete work |
| Next-level loading | Reuse spinner | Reuse existing loader via a controlled sidebar contract |
| Reload behaviour | Not addressed | Restore valid identifiers or fall back safely |
| Testing | Eight acceptance cases | Pure progression tests plus mobile/desktop browser coverage |

---

## Review notes

Claude's history approach is smaller, but same-URL history state is fragile
across reloads, consecutive lessons, and tab changes. Codex's URL-backed marker
is more coherent, though it touches root search validation and therefore needs
careful scoping.

Claude's three completion actions are useful, especially `Review this lesson`.
Codex's separate level milestone better recognises a real CEFR achievement.
These ideas combine cleanly.

### Correction to the Claude plan

Claude stated TanStack Router is used in "exactly two places." That is wrong —
`/`, `/index`, `/pricing`, `/account` and `/family-setup` are all routes. The
error came from grepping `useNavigate` usage rather than `createFileRoute`
declarations. **The important conclusion still stands: ordinary app tabs are
state-driven.** Corrected in place in `CLAUDE_PLAN.md`.

### Gap in BOTH plans

The mobile lesson back-arrow sits **behind the fixed quiz modal** while a quiz is
open. Toby's requirement was explicitly "at any time," so browser Back or an
in-quiz `Back to Grammar` action must cover that state. Neither plan designed
this; Claude's acceptance test even asserted it passes.

---

## Approved implementation

1. Mobile route-backed stacked view; desktop split view unchanged.
2. Push **one** curriculum→lesson history entry.
3. **Replace** that entry when advancing lessons.
4. Perfect result actions: `Next lesson`, `Review lesson`, `Back to Grammar`.
5. Canonical next-incomplete progression, with wraparound.
6. When `allDone`, show the level milestone with `Start A2`, `Review lesson`,
   `Back to Grammar`.
7. C2 milestone ends with `Back to Grammar`.
8. All scoring and award logic stays inside `QuizCard`.
9. Add an accessible quiz-state escape path so Back works during the quiz too.

Codex's plan is the structural basis; Claude's `Review lesson` action is folded
into the completion set; the quiz-escape path (item 9) is new to both.

---

## Boundaries

No merge to `main` and no Production deploy without Toby's explicit approval.
Both source PRs remain draft until the hybrid is built and reviewed.

---

# INTEGRATION RESULT

**Status: `integration-checkpoint-complete`**
Integration commit: `acb70b1c8aea12381a8699479a1f13287f52ea6c`
Branch: `integrate/duo-003-grammar-flow` · from `main` @ `8d8ae38`
Integration lead: Claude Code · Independent QA: Codex

## All nine approved items implemented

| # | Item | Where |
|---|---|---|
| 1 | Mobile stacked view; desktop split unchanged | `GrammarStudio.tsx` |
| 2 | One curriculum→lesson history entry | `GrammarStudio.tsx` |
| 3 | Replace that entry when advancing | `handleSelect(…, "replace")` |
| 4 | Next lesson / Review lesson / Back to Grammar | `LessonView.tsx` |
| 5 | Canonical next-incomplete with wraparound | `src/lib/grammar-flow.ts` |
| 6 | Level milestone with `Start {next}` | `LessonView.tsx` |
| 7 | C2 ends with Back to Grammar, no fake next | `grammar-flow.ts` |
| 8 | Award logic untouched inside `QuizCard` | — |
| 9 | Quiz escape path (in-quiz exit, Escape, `role="dialog"`) | `QuizCard.tsx` |

## Verification at `acb70b1c`

| Check | Result |
|---|---|
| `node --test` | **54/54 pass** (10 new progression tests) |
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 2 errors — **both pre-existing** `no-useless-escape` at `QuizCard.tsx:55-56`, confirmed by linting the unmodified HEAD copy of that file |

### Browser, 390×844

| Behaviour | Before | After |
|---|---|---|
| Tap a lesson | appended below the whole accordion, off-screen | **replaces the list** |
| Back affordance | none | `← BACK TO A1` above every state |
| History entry | none | pushed on open |
| Browser/gesture back | exited the app | **returns to the curriculum** |
| Load feedback | none | skeleton + "Composing your lesson…" |
| Page errors | — | none |

The last-in-array wraparound case is covered by test, not by assertion: a
learner completing out of order wraps to the earliest outstanding lesson rather
than seeing a false "level complete".

## Not verified

- The completion panel was not exercised end-to-end; it requires passing a
  generated quiz perfectly, which needs a live model run. Its progression logic
  is covered by the pure tests, but the rendered panel has not been seen.
- Desktop 1440 was not re-captured this pass. The change is gated behind
  `md:hidden` / `hidden md:block`, so desktop should be untouched — that is
  reasoning, not evidence, and is flagged for QA.
- No Vercel Preview created for this branch yet.

## Boundaries

No merge to `main`. No production deploy. `main` remains at `8d8ae38` plus the
already-merged DUO-002 work. Codex's DUO-003 branch was read read-only.
