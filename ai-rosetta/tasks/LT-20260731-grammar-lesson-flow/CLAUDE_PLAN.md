# CLAUDE_PLAN — DUO-003 Grammar lesson flow

Agent: Claude Code
Branch: `claude/duo-003-grammar-flow`
Baseline: `main` @ `8d8ae38`
PR: #11
Status: `independent-complete`

Written without reading `CODEX_PLAN.md` or `codex/duo-003-grammar-flow`.

---

## 1. What I verified before designing

The brief's root cause holds. Three further facts materially change the answer,
and I found them by reading the app rather than reasoning from the symptom:

**a. Tabs are state, not routes.** `currentTab: TabKey` in `app-state.tsx:204`,
moved by `SET_TAB` (`:284`, `:422`).

> **CORRECTION (Toby, 2026-07-31).** This originally read "the TanStack router is
> used in exactly two places — `/account` and `/family-setup`." That was wrong.
> There are **five** routes: `/`, `/index`, `/account`, `/family-setup`,
> `/pricing`. I reached the wrong number by grepping `useNavigate` usage instead
> of `createFileRoute` declarations — wrong method, wrong answer.
>
> The conclusion still holds: ordinary app tabs are state-driven, and the routed
> pages that exist (`/account`, `/family-setup`, `/pricing`) sit outside the app
> shell. But the supporting fact was overstated and is corrected here rather than
> quietly edited.

**b. Nothing in the app pushes history for in-app views.** A repo-wide grep of
`src/components/` and `src/state/` for `pushState` / `popstate` returns nothing.
The More sheet, the library drawer, the Word Card and the module picker all open
and close without touching history.

**c. Browser back is therefore already inert** for every in-app transition. It
does not return you from Flashcards to Reader; it exits the app.

That last point reframes the brief's question. "Which option keeps browser-back
coherent" presumes back is coherent today. It is not — and that is the honest
finding, not a quibble.

---

## 2. Answers to the four questions

### Q2 first, because it constrains the rest — route, stacked view, or sheet?

**Stacked view inside the Grammar tab, plus an explicit history entry.**

Rejecting the alternatives on evidence rather than taste:

- **A route is wrong here.** Every other tab is state. Making lessons the single
  routed sub-view means one surface behaves unlike the other thirty, and the
  route sits outside the tab model that `tab-registry.ts` exhaustively maps. It
  would also risk the `/account` failure mode — leaving the shell and losing the
  bottom nav, which is now the only way to reach Tutor.
- **A sheet is wrong for content you dwell in.** The app already uses sheets for
  the More menu — a transient chooser. A grammar lesson with an embedded quiz is
  a destination, not a menu. Sheets also cap height and fight a long lesson.
- **A stacked view matches the architecture exactly**: `GrammarStudio` already
  owns `activeLesson`; the mobile fix is to render *either* the level list *or*
  the lesson, never both, instead of stacking them vertically.

**But stacked-view alone leaves back broken**, which is why I pair it with one
targeted addition: push a history entry on lesson open and listen for `popstate`
to close it. That gives the phone's back gesture the behaviour Toby expects
without restructuring thirty tabs into routes. It is ~15 lines, scoped to
Grammar, and reversible.

I want to flag the cost honestly: this makes Grammar the only surface where
browser-back does something. That is an inconsistency. I judge it worth it
because Grammar is the only surface with a genuine parent→child depth — but a
reasonable reviewer could argue the opposite, and if the counter-argument is
"fix back everywhere or nowhere," I would not fight it.

### Q1 — auto-advance, button, or both?

**Explicit "Next lesson" button. Not auto-advance.**

Auto-advance is wrong for this specific product. A grammar quiz ends on a score
and a `+50 XP` toast (`QuizCard.tsx:144`). Yanking the learner into new material
during that moment destroys the only feedback beat in the surface. It also
removes the choice to re-read the lesson they just tested on — which, for
grammar specifically, is the behaviour a struggling learner most needs.

The completion panel should offer three things, in this order of prominence:
1. **Next lesson →** (primary) — named, so the learner knows what they are
   choosing, not just "Next"
2. **Review this lesson** (secondary) — returns to the lesson body, quiz closed
3. **Back to `{level}`** (tertiary) — the level list

### Q4 — end of level

`QuizCard.tsx:149-150` already computes `allDone`. When the finished lesson is
the last incomplete one in its level, the primary action becomes
**Start `{nextLevel}` →** (e.g. A1 → A2), which selects the next CEFR level and
opens its first lesson.

When it is the final lesson of the final level, the primary action is
**Back to Grammar**, with the completion state shown plainly. No fake next step.

### Q3 — should desktop change?

**No.** The side-by-side layout works and Toby did not report a desktop problem.
The entire fix lives below `md`. Desktop keeps `LevelSidebar` and `LessonView`
adjacent; the back control renders only where the stacked view is active.

The one desktop-affecting change is the completion panel from Q1, which is an
improvement there too — desktop currently has the same dead end.

---

## 3. Implementation sketch

| Change | File | Note |
|---|---|---|
| Render list **or** lesson below `md` | `GrammarStudio.tsx:68` | replace `flex-col … md:flex-row` with a conditional; keep `md:flex-row` intact |
| Back control | `LessonView` header | mobile-only; label `← {level}` so the destination is named |
| History entry + `popstate` | `GrammarStudio` | push on open, pop closes lesson; clean up on unmount |
| Completion panel | `LessonView.tsx:185` | replace bare `setShowQuiz(false)` with next/review/back |
| Next-lesson resolution | new helper | next incomplete in level → next level → done |

Reuses `allDone` and the `completed` map; adds no new persisted state.

## 4. Acceptance tests

1. 390px: tapping a lesson replaces the level list; the lesson is visible without
   scrolling.
2. 390px: back control returns to the level list at any point, including
   mid-quiz.
3. Phone back gesture from an open lesson returns to the level list rather than
   exiting the app.
4. Completing a quiz shows Next / Review / Back, and Next opens the next
   *incomplete* lesson.
5. Completing the last lesson in a level offers the next level by name.
6. Completing the final lesson of the final level offers no fake next step.
7. Desktop 1440px side-by-side is unchanged.
8. XP award, completion records and lesson content are unchanged.

## 4b. Gap both plans missed — found by Toby

Neither plan handles the back requirement **while the quiz modal is open**.

`QuizCard` renders as a fixed overlay, so the mobile lesson header — and the back
control I specified there — sits behind it. Toby's requirement was explicitly
"at any time," and both plans satisfy it only while the quiz is closed.

Fix must come from one of:
- an in-quiz `Back to Grammar` action, or
- browser Back closing the quiz first, then the lesson.

Recorded here because it invalidates an acceptance test I wrote ("back returns to
the level list at any point, including mid-quiz") — I asserted that case passes
without designing the mechanism that would make it pass.

## 5. Risks

1. **Back-behaviour inconsistency** — Grammar becomes the only surface where
   browser back does something (§2, stated as a cost, not hidden).
2. **`popstate` and the More sheet** could interact if both are open; the
   listener must be scoped and removed on unmount.
3. **"Next incomplete" vs "next in order"** is a real product choice. I chose
   next *incomplete* so a returning learner is not walked through work they have
   already done; someone could reasonably prefer strict order.
4. **AI generation latency** — Next lesson may land on a generating state.
   Reuse the existing spinner rather than inventing a new one.
