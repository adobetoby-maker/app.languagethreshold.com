# Codex independent plan — grammar lesson flow

## Product position

The Grammar Studio should feel like a curriculum browser that opens a focused learning surface, not like an accordion that silently appends more content. On mobile, selecting a lesson should replace the curriculum list with the lesson at the top of the viewport. On desktop, the existing curriculum/lesson split should remain intact.

Quiz completion should never move the learner before they have read their result. The product should offer a clear next action, preserve the celebration and award feedback, and let the learner return to the curriculum instead.

## Source verification

I verified the brief against the baseline source:

- `GrammarStudio.tsx:68-76` renders `LevelSidebar` followed by `LessonView` in a `flex-col md:flex-row` container. Below `md`, a selected lesson is mounted after the complete curriculum accordion, with no scroll or view transition.
- `LessonView.tsx:180-187` closes the quiz from `onComplete` and leaves the same completed lesson selected.
- `QuizCard.tsx:134-160` already records perfect completion, awards 50 XP, derives the completed lesson map, computes `allDone`, and awards the level badge. Navigation is the missing layer; the persistence and award semantics should not move.
- `QuizCard.tsx:308-343` already has a stable results state. Its successful `Continue` control is the right place to expose the next action without adding timed behavior.
- `grammar-state.tsx:21-25` preserves an ordered `lessons` array and completion by lesson id. That is sufficient to derive the next unfinished lesson without new durable state.
- `FlashcardDecks.tsx:133-143` establishes the useful list-to-focused-session pattern with an explicit exit. Grammar should adopt that mobile mental model, while adding URL/history wiring that Flashcards currently lacks.

No correction to the shared facts is needed.

## Decisions on the open questions

### 1. Explicit next action, not timed auto-advance

Use an explicit primary button after a perfect quiz. Do not auto-advance on a timer.

Why:

- The result, XP award, and possible badge are meaningful feedback. Automatically replacing that state risks making the award feel lost or broken.
- Learners may want to reread the score, stop for the day, or return to the curriculum.
- An explicit action is predictable for assistive technology and avoids motion immediately after a high-attention task.
- It fixes the dead end without introducing a preference, countdown, cancellation control, or new persisted state.

The successful result actions should be contextual:

- When another lesson remains in the current level, primary: `Next lesson`, with the next lesson title shown nearby. Secondary: `Back to Grammar`.
- If the learner completed lessons out of order, choose the next unfinished lesson in canonical `LevelState.lessons` order. Search after the current lesson first, then wrap to the first unfinished lesson. Do not use the module-focused display sort as curriculum order.
- When `allDone` becomes true, primary: `Finish {level}`. This opens the level milestone described below rather than silently selecting another lesson.
- A non-perfect result keeps the current `Try again` and `Continue anyway` behavior. It must not expose `Next lesson`, because the lesson was not recorded complete.

Advancing from one lesson to another should replace the current mobile lesson history entry, not push another one. One Back action should return to the curriculum, not walk backward through every lesson completed in the sitting.

### 2. Mobile uses a route-backed stacked view

Use a stacked in-place view inside Grammar Studio, not a sheet and not a separate application route.

The list and lesson are mutually exclusive below `md`:

1. Curriculum list.
2. Focused lesson.
3. Optional level-complete milestone.

This matches the app's focused Flashcards session model and keeps the existing Grammar provider, tab shell, subscription gate, and lesson state mounted in the same ownership boundary. A sheet is a poor fit for a long, scrollable lesson and would visually imply a temporary overlay. A new `/grammar/...` route would require moving or duplicating providers currently owned by the root route and would expand this navigation fix into an app-shell refactor.

Browser history must still be real. Represent the mobile stack depth with validated search state on the existing `/` route, using stable `level` and `lessonId` identifiers:

- Selecting a lesson on mobile pushes one history entry.
- The lesson's visible back-arrow uses browser back when that entry exists.
- Browser Back removes the lesson search state and reveals the curriculum list.
- `Next lesson` replaces the current lesson entry.
- Leaving Grammar through app navigation clears the grammar lesson search state with replace semantics so stale lesson history cannot reopen under another tab.
- A reload may restore the focused lesson only after grammar hydration and only if the referenced lesson still exists for the selected language; otherwise it safely falls back to the curriculum.

The selected lesson should be derived from identifiers plus the grammar store, rather than storing a second durable copy of the `LessonStub`.

### 3. Preserve desktop layout

Do not redesign desktop. At `md` and above, keep the 280px curriculum sidebar and lesson pane side by side.

Desktop receives the universal completion improvement: `Next lesson`, `Back to Grammar`, and the level milestone. Selecting the next lesson updates the existing right pane. The mobile back-arrow and horizontal stacked transition stay hidden because the curriculum is already visible on desktop.

This keeps the working comparison/browsing workflow and sharply limits layout risk.

### 4. Show a level milestone before the next level

After the final outstanding lesson makes `allDone` true, replace the lesson/result with a concise level-complete surface:

- `A1 complete` (or the relevant level) as the primary message.
- The existing earned badge and `+50 XP` confirmation, presented as already-awarded outcomes rather than awarding them again.
- A completed count such as `8 of 8 lessons`.
- For A1-C1, primary: `Continue to {nextLevel}`; secondary: `Back to Grammar`.
- For C2, primary: `Back to Grammar`; secondary: `Review completed lesson`, with copy recognizing completion of the grammar path rather than promising a nonexistent next level.

There is no countdown and the next level does not begin until the learner chooses. `Continue to {nextLevel}` should use the existing lesson-title loading behavior unchanged, then open the first canonical lesson when available. While that existing request runs, the focused surface should show a clear next-level loading state. If it fails, show the existing recoverable error/retry path and retain the completed level state.

If the current lesson happens to be last in the array but another lesson in the level is incomplete, this is not a level milestone. `Next lesson` should wrap to that unfinished lesson.

## Interaction and presentation details

- Put an `ArrowLeft` icon button at the start of the focused mobile lesson header with an accessible name such as `Back to Grammar`. Keep it available above loading, error, lesson-content, and completed states.
- On lesson entry and next-lesson selection, reset the Grammar content scroller to the top and move focus to the lesson heading (or the back control before content exists). This makes the view change perceivable without relying on animation.
- Use a short horizontal enter/exit transition that respects `prefers-reduced-motion`. The list should not remain in document flow or continue consuming height while the mobile lesson is active.
- Keep the global mobile bottom navigation and Tutor action available; the focused lesson is a page within the tab, not a fullscreen modal.
- Preserve `WordCard`, clickable examples, quiz modal behavior, lesson content, and all existing error/loading copy except where a dedicated next-level loading label is necessary.
- Changing target language while a lesson is active should return to that language's curriculum rather than retaining identifiers from the prior language.

## Implementation shape

### Centralize progression as a pure derivation

Add a small pure grammar-flow helper that receives the canonical CEFR order, current level, ordered lessons, current lesson id, and completion map including the just-completed lesson. It returns one of:

- `next-lesson` with a lesson id;
- `level-complete` with the next CEFR level when one exists;
- `course-complete` for C2.

This isolates the wraparound and end-of-level rules from rendering and makes the previously unused `allDone` information actionable without adding global state.

### Let GrammarStudio own navigation

`GrammarStudio` should remain the owner of active level/lesson presentation and become the owner of the mobile stack/history contract. It should:

- resolve active identifiers against `useGrammar()` state;
- choose list, lesson, or milestone on mobile;
- keep list and lesson together on desktop;
- expose select, back, next, and finish-level handlers;
- coordinate next-level expansion/loading through the existing title-loading behavior rather than creating a second fetch path.

`LevelSidebar` may need a controlled expanded-level value or a narrow `ensure/select first lesson` contract so returning from a milestone can reveal the next level. Do not duplicate its timeout, retry, sorting, or lesson-generation logic.

### Keep award logic in QuizCard

`QuizCard` should continue to own answer evaluation, `markComplete`, completion counter, XP, confetti, badge, and achievement calls. Extend its completion contract only enough to expose the already-derived completion outcome and render destination-aware actions.

`LessonView` should receive navigation callbacks and render the always-available mobile back control. It should not compute or persist curriculum progress independently.

## Verification plan

### Deterministic tests

Add focused tests for the pure next-step derivation:

- middle lesson completed -> next canonical lesson;
- current last lesson with an earlier incomplete lesson -> wraps to that lesson;
- all lessons completed in A1-C1 -> level-complete with the correct next CEFR level;
- all lessons completed in C2 -> course-complete;
- module-focused display reordering does not alter canonical progression;
- missing/stale lesson id falls back safely instead of throwing.

Add component-level coverage where the existing harness permits:

- successful quiz records the same completion, XP, and badge effects and shows `Next lesson`;
- unsuccessful quiz preserves retry/continue behavior and does not advance;
- clicking `Next lesson` selects the derived target without replaying award effects;
- level milestone presents already-recorded outcomes and does not award twice.

### Browser acceptance

At a phone viewport (390x844):

1. Open Grammar and tap a lesson near the top of A1.
2. Confirm the curriculum disappears from layout, the lesson heading is immediately visible at the top, and the back-arrow is present during loading and after content renders.
3. Press browser Back and confirm the curriculum returns with the same level expanded and completion indicators intact.
4. Re-enter, finish a perfect quiz, and confirm the result remains visible with explicit `Next lesson` and `Back to Grammar` actions.
5. Choose `Next lesson`; confirm the new lesson starts at the top and one browser Back returns to the curriculum rather than the prior lesson.
6. Complete the final outstanding lesson in a level; confirm the milestone, next-level action, failure recovery, and C2 terminal variant.
7. Confirm no overlap with the bottom navigation, Tutor action, quiz modal, or Word Card.

At desktop width (1280x800):

1. Confirm the sidebar remains 280px and the selected lesson remains visible beside it.
2. Confirm lesson selection, loading, clickable examples, quiz, completion, and next-lesson replacement work in the existing right pane.
3. Confirm the mobile back-arrow and stacked transition are absent.

Run `git diff --check`, focused tests, the complete test suite, TypeScript, `npm run rosetta:check`, lint with zero errors, and `npm run build`. Do not invoke the AI lesson-generation path during deterministic or browser verification; seed or mock lesson data.

## Scope guard

Expected implementation work belongs only to Grammar presentation/navigation, a pure progression helper, root search-state validation if required, and focused tests. It must not alter curriculum text, generated lesson/quiz payloads, persistence schema, scoring thresholds, XP values, completion records, Production configuration, or deployment behavior.

Status: independent-complete
