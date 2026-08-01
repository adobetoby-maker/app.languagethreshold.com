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

**Status: `repair-complete — awaiting-codex-re-review`**
Integration commit (repaired): `0255749` (integrate/duo-003-grammar-flow)
Prior integration commit: `acb70b1c` (checkpoint, four findings outstanding)
Branch: `integrate/duo-003-grammar-flow` · from `main` @ `8d8ae38`
Integration lead: Claude Code · Independent QA: Codex (re-review requested)

## All nine approved items implemented (unchanged from `acb70b1c`)

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

## Four Codex QA findings — repaired at `0255749`

| Finding | Root cause | Fix |
|---|---|---|
| F1 `Start {nextLevel}` no-op | `onClick` called `onBack` instead of `onStartNextLevel` | New `onStartNextLevel` prop on `LessonView`; `openLevel` prop + `useEffect` on `LevelSidebar` that expands and loads the named level; `handleStartNextLevel` callback in `GrammarStudio` that threads the state |
| F2 Stale completion UI | `finished` local state persisted when the desktop sidebar re-selected a different lesson on the same mounted `LessonView` | `useEffect(() => setFinished(false), [lesson.id])` — resets on lesson change |
| F3 False C2 copy | "You have finished every CEFR level." appeared after completing only C2 lessons | Computed `allLevelsComplete` via `isLevelComplete` across all 6 CEFR levels; conditional copy gates on that |
| F4 Lint error | `\[` inside `[…]` character class = useless escape → `no-useless-escape` error | Removed the backslash from two regex character classes in `normalize()` |

## Verification at `0255749`

| Check | Result |
|---|---|
| `git diff --check` | 0 whitespace errors |
| `node --test` | **59/59 pass** (17 new DUO-003 regression assertions added) |
| `npx tsc --noEmit` | 0 errors |
| `npm run rosetta:check` | 7 artifacts verified, gate passed |
| `npm run lint` | **0 errors** (Finding 4 resolved) |
| `npm run build` | ✓ Vercel Build Output API v3 artifact created |

## Not verified

- The completion panel was not exercised end-to-end; it requires passing a
  generated quiz perfectly, which needs a live model run. Its progression logic
  is covered by the pure tests, but the rendered panel has not been seen.
- Desktop 1440 was not re-captured. The change is gated behind
  `md:hidden` / `hidden md:block`, so desktop should be untouched — that is
  reasoning, not evidence, and is flagged for Codex re-review.

## Boundaries

No merge to `main`. No production deploy. `main` remains at `8d8ae38` plus the
already-merged DUO-002 work. Codex's DUO-003 branch was read read-only.
