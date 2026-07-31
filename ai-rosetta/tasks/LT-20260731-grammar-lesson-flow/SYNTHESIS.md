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
