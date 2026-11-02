# Spanish 101 · General Core 60

This course addresses the empty general Core 60 entry. Previously, Core (Free) selected no module, and Core 60 asked for a specialty course rather than offering a beginner path.

## Coverage

Target **Spanish**, native/support **English**, only. Other language pairs are not authored by this change. Stable stage IDs and local numbering:

| Stage | Module | Lessons | Content and practice |
| --- | --- | ---: | --- |
| Foundation | foundation-spanish-basics | 10 | Greetings/vowels, articles, plurals, pronouns, ser, estar, hay, numbers/age, questions/negation, help phrases |
| Core | spanish-basics | 30 | Regular verbs, agreement/possession, common irregulars, questions/time, gustar, wants/ability/obligations, routines, locations, plans/progressive, comparisons/pronouns, first past-tense contrasts, por/para, connected ideas |
| Master | master-spanish-basics | 20 | Beginner grammar applied in familiar classroom and everyday situations; paired with cumulative review readings |

Each stage has aligned readings, vocabulary/phrases, present-tense verb reference forms, six modes (See/Recall/Hear/Type/Say/Write), exact full Reader ownership, authored module cards/decks, progressive teaching settings, and lesson-specific speaking cards. Master here means applying the basics; the partner does not switch to advanced B1/B2 teaching.

Each lesson includes three accent-sensitive cloze checks. All must be correct before the learner can record their own mastery verdict. Existing account/pair/enrollment-scoped lesson logs save completion; opening activities alone does not establish mastery. This is practice evidence, not a proficiency assessment or certification. Existing spaced-review and needs-practice controls remain available.

## Authoring and review

State: **mapped 60 draft**. Original readings and explanations are in `content/spanish-basics/outline.json` and `master.json`. The Master readings pair a new situation with an earlier related reading for cumulative practice. The frozen lexicon adapts existing app vocabulary with context corrections; `verbs.json` supplies authored present-tense references. Build with `npm run build:spanish-basics`, then regenerate library packs and the curriculum word index.

Human language/teaching review remains pending, and all public review flags remain false. The separate signed global Verb Games pool excludes this new draft module; per-lesson verb practice is provided. No bespoke formal exam, human-recorded audio, or verified offline download pack is included. Online AI conversation keeps the existing consent/account policy. Existing subscription and Foundation account policies remain; no billing or plan changes are made.

## Entry points

New Spanish/English learners have a Start Spanish 101 option in onboarding. The module picker pins a Start from zero card near Core (Free). The default Core 60 page links directly to Foundation instead of requiring a profession. Specialty Core 60 pages also link to this general beginner course. Selecting these links does not overwrite other courses' saved progress.

Foundation: `/?tab=core30&module=foundation-spanish-basics&target=Spanish&native=English`
Core: `/?tab=core30&module=spanish-basics&target=Spanish&native=English`
Master: `/?tab=core30&module=master-spanish-basics&target=Spanish&native=English`

## Verification

All 60 lessons passed the app's real content and stage validators. The skill audit reports 60 valid authored and 60 mapped lessons, with 60 aligned readings, speaking cards, and full Reader passages. Nine desktop/phone browser tests passed (including setup), covering discovery, all modes, retrieval gating, saved completion, Reader handoff, and stage navigation. The initial tests exposed a test-fixture team request and stale generated library packs; these were corrected before the successful run.

Publication and final release checks are recorded separately after deployment. Physical iPhone and instructor confirmation remain pending.
