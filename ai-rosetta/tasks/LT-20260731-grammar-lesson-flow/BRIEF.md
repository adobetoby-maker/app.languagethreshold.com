# DUO-003 — Grammar lesson flow

Task: `LT-20260731-grammar-lesson-flow`
Repository: `adobetoby-maker/app.languagethreshold.com`
Baseline: `main` @ `8d8ae38`
Reported by: Toby Anderton, from live production use
Status: shared brief — independent phase next

## What Toby reported

> After you finish a grammar section, ie take the quiz, it should either take you
> to the next lesson or should have a "next lesson" button. I also think the
> mechanic should change — the lesson is a scroll down and it is not visible that
> it loaded. It should shift right into its own page, then when you finish, or at
> any time, a back arrow will allow you to return to the main grammar section.

## Verified root cause — confirmed in source, not inferred

**1. The lesson loads off-screen on mobile.**
`src/components/grammar/GrammarStudio.tsx:68` lays the surface out as:

```
<div className="flex flex-col gap-5 md:flex-row">
```

`md:flex-row` gives a side-by-side sidebar/lesson split on desktop. Below `md`
it is `flex-col`, so `LessonView` renders **beneath the entire CEFR accordion**.
Tapping a lesson on a phone loads it below the fold with no scroll, no
transition, and no visual acknowledgement. Toby's "not visible that it loaded"
is precisely this.

**2. Finishing a quiz is a dead end.**
`src/components/grammar/LessonView.tsx:185`:

```
onComplete={() => { setShowQuiz(false); }}
```

Completion closes the quiz and returns the learner to the lesson they have just
finished. `QuizCard.tsx:144` fires "✦ Lesson complete +50 XP" and
`QuizCard.tsx:149-150` records completion and computes `allDone`, so the data to
offer a next step already exists — it is simply not used.

**3. There is no back affordance.**
Repo-wide grep across `src/components/grammar/*.tsx` for `next lesson`,
`nextLesson`, `back to`, `← back`, `onBack` returns **nothing**. Once a lesson is
open on mobile there is no modelled way back to the level list.

## Required outcome

1. **Lesson opens as its own view on mobile**, not appended below the accordion.
   Entering a lesson should be unmistakable.
2. **A back affordance is available at any time**, returning to the grammar
   level list — not only after completion.
3. **Completing a quiz offers the next step**: either advance automatically or
   present an explicit "Next lesson" control. Decide which, and justify it.
   Handle the last-lesson-in-level case; `allDone` already exists.

## Constraints

- Do not regress the desktop side-by-side layout, which works today.
- Preserve the existing lesson content, quiz behaviour, XP award, and completion
  records. This is navigation and presentation, not curriculum.
- Browser back / history behaviour must stay coherent with whatever is chosen.
- Keep it consistent with the app's existing navigation idiom; the Reader and
  Flashcards already establish patterns worth matching rather than inventing
  against.

## Open questions for each agent to answer independently

- Auto-advance, explicit button, or both — and what happens at the end of a level?
- Is the mobile lesson a route, a stacked view, or a sheet? Which keeps browser
  back sane?
- Should desktop change at all, or only mobile?
- What should the learner see between finishing the last lesson of a level and
  starting the next level?

## Independent phase protocol

- Claude writes only `CLAUDE_PLAN.md`; Codex writes only `CODEX_PLAN.md`.
- Neither reads the other's plan before both are marked `independent-complete`.
- Shared factual corrections belong in this `BRIEF.md`, not in the other's plan.
- Cross-review follows, then one synthesis, then Toby decides.

## Out of scope

Merging to `main`, deploying Production, curriculum or lesson-content changes,
and the AI lesson-generation path.
