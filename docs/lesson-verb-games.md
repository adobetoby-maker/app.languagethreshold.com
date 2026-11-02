# Lesson verb games

Five games are embedded in See It on the website and opened with **Verb games · this lesson** above the six modes in V4: meaning matching, conjugation matching, hangman, choose the form, and type the form. Games use the loaded lesson's authored verbs. The five new Spanish courses and Spanish 101 are covered across Foundation, Core and Master (360 lessons). Other authored lessons can use the same components.

For the conjugation-pattern course, the taught pattern takes precedence over the separate present-tense reference tables. Every bank contains the ten authored verbs and all their available forms. A round selects one form per verb, up to ten distinct answers; replay varies the practiced person. Matching removes duplicate answer strings so shared forms do not produce two apparent correct matches. Each board displays at most four pairs, with subsequent boards until the round is complete.

Hangman allows six wrong letters and supplies accented letters including ñ and ü. It reveals the answer after six misses; typing and choices allow correction. Exact accents are required, with Unicode composition, case and surrounding whitespace normalized. Feedback, replay and answer playback are available. Playback follows the existing website/native voice settings and recorded audio lookup. Scores are practice feedback only and never write lesson mastery or six-mode progress.

Website source: `src/lib/lesson-verb-games.ts`, `src/components/core30/LessonVerbGames.tsx`, `src/components/guide/AppGuide.tsx`.

V4 source: `Shared/LessonVerbGames.swift`, `App/LessonVerbGamesView.swift`, `App/PracticeSessionView.swift`. This is native iPhone/iPad source integration; no TestFlight upload is implied.

Validation covers lesson-local answers across all 360 lessons, pattern precedence, Unicode/accents and ambiguity filtering. Browser tests play all five games in Core usage verbs, Core conjugation patterns and Master common patterns on desktop and phone. Native tests cover all lesson banks and a UI flow through the taught pattern.
