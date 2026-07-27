# CODEX_PLAN — DUO-002

Status: `independent-complete`

Hands seat: `codex_hands`  
Workspace branch supplied to this seat: `claude/usability-onboarding`  
Starting commit: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`

Independence statement: no `CLAUDE_PLAN.md` or other counterpart implementation plan exists in
this workspace, and none was read. This plan derives from the frozen founder brief, approved
vision, final build specification, and direct source inspection.

## Product approach

Use “Magic before map”: give a signed-out learner one obvious Reader-first action, a
beginner-ready passage, and guidance that responds to tap, ask, and save actions. Keep every
registered tool reachable through a complete catalog, with existing specialty gates intact.
Make cross-tool continuity visible where it is real: Reader context to Tutor, saved words to My
Vocab, and My Vocab to Flashcards.

## Build order

1. Correct the structured Reader → Tutor context chain.
2. Budget bottom navigation, Tutor, and MiniPlayer as one fixed control strip.
3. Remove learner-facing diagnostics and make Grammar waits honest and finite.
4. Replace blocking role setup with the Reader-first entry; retain optional personalization.
5. Add action-triggered guidance and delay the progress prompt until value.
6. Add purpose metadata and a gate-aware catalog for all 31 registered tabs.
7. Apply restrained activity accents while preserving the existing ivory/midnight/gold themes.
8. Create demo source documents; defer recording and preview work while deployment truth A1 is
   unresolved.

## Inventory method

The tables below cover the exact requested inventory fields in compact form:

- “Problem / reason / stage” = intended learner problem, why Toby likely built it, and learning
  stage.
- “Receives → produces” = information received and produced.
- “Connection” = verified connection to other tools.
- “Entry / mobile” = current entry point and mobile usability.
- “Strong / confusing” = what is already strong and what is confusing.
- “Change / disposition” = recommended change and keep/revise/combine/defer decision.

Classification is `universal` unless the row explicitly says `module-gated`. “Catalog” means the
new complete toolkit catalog; it does not bypass a gate.

## Registered tabs — 31 reconciled

### Understand

| Tool             | Problem / reason / stage                                                   | Receives → produces                                                                             | Connection                               | Entry / mobile                               | Strong / confusing                                                                            | Change / disposition                                       |
| ---------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Reader           | Real text is hard to decode; the original product doorway; Understand      | Passage, language, paired sentences, module focus → clickable text, selection, sentence context | Word Card, Tutor, notes, speech, library | Bottom nav + catalog; two-pane mobile scroll | Strong parallel context and samples; baseline default was C2 and tap behavior was unexplained | Beginner default + tap hint + safe scroll; **revise/keep** |
| Grammar Studio   | Learners need patterns behind text; systematic CEFR study; Understand      | Language, CEFR level, module focus → lessons, examples, quiz progress                           | Patterns, Dashboard, module focus        | Bottom nav + catalog; responsive sidebar     | Strong CEFR structure and Retry; indefinite baseline wait                                     | Staged wait + timeout; **revise/keep**                     |
| Daily Story      | Learners need manageable daily reading; habit/fluency; Understand          | Language, level, vocab → generated/selected short story                                         | Reader-style comprehension, vocab reuse  | Catalog/More; single-column mobile           | Strong short daily scope; relationship to Reader was unclear                                  | Purpose line and catalog placement; **keep**               |
| Dictionary       | Learners need precise reference; morphology and lexical depth; Understand  | Query, language → forms, meanings, profiles                                                     | Supports Reader questions and writing    | Catalog/More; search-led mobile              | Strong specialized word data; separate from contextual Word Card                              | Explain reference role vs contextual role; **keep**        |
| Cognate Bridge   | Learners can exploit familiar roots; accelerate comprehension; Understand  | Language and cognate rules → recognized families and examples                                   | Reader, Dictionary, vocab learning       | Catalog/More; card-based mobile              | Strong immediate transfer value; hidden among tabs                                            | Purpose line under Understand; **keep**                    |
| Grammar Patterns | Learners need reusable structures; bridge noticing to practice; Understand | Language, pattern progress, vocab → drills and mastery state                                    | Reader/Tutor context, Pen Pal, Dashboard | Catalog/More; drill cards                    | Strong SRS connection; distinction from Grammar Studio unclear                                | Explain “notice/rehearse” role; **revise/keep**            |

### Remember

| Tool          | Problem / reason / stage                                             | Receives → produces                                                     | Connection                        | Entry / mobile                                | Strong / confusing                                                                | Change / disposition                             |
| ------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| Flashcards    | Saved words fade; durable recall; Remember                           | `userVocab`, module decks, SM-2 state → due cards and retention updates | My Vocab, Reader saves, Dashboard | Bottom nav + catalog; strong mobile hierarchy | Strong due/deck/card hierarchy; “My Vocab” naming was not visible enough upstream | Preserve hierarchy and name continuity; **keep** |
| Word Match    | Recall needs speed; short retrieval practice; Remember               | Personal/module vocabulary and progress → match results/mastery         | My Vocab, Games, Dashboard        | Catalog/More; touch grid                      | Strong short loop; crowded toolkit obscured purpose                               | Purpose line and catalog placement; **keep**     |
| Idiom Master  | Literal translation fails for idioms; phrase fluency; Remember       | Language, level, idiom set → recognition and leaderboard state          | Games and broader vocabulary      | Catalog/More; compact quiz                    | Strong discrete challenge; not connected narratively                              | Explain phrase-level recall; **keep**            |
| False Friends | Familiar forms create confident mistakes; error prevention; Remember | Language pair and item set → choices, corrections, score                | Games, cognates contrast          | Catalog/More; quiz cards                      | Strong focused problem; easily mistaken for a generic game                        | Pair with Cognates in purpose copy; **keep**     |
| Conjugation   | Verb forms are slow under pressure; automaticity; Remember           | Language, level, frequency verbs, user vocab → scored runs              | Sentence Builder, Speak, Games    | Catalog/More; quiz interaction                | Strong level and leaderboard structure; purpose hidden                            | Name recall outcome; **keep**                    |

### Use

| Tool             | Problem / reason / stage                                          | Receives → produces                                                                    | Connection                                           | Entry / mobile                                | Strong / confusing                                                  | Change / disposition                                    |
| ---------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- |
| Listening Drill  | Written recognition does not equal listening; ear training; Use   | Language, generated drill, speech audio → selected answers/score                       | Reader audio, Speak, Games                           | Catalog/More; mobile answer list              | Strong modality change; buried                                      | Purpose line under Use; **keep**                        |
| Sentence Builder | Known words remain fragments; sentence production; Use            | Language, level, generated prompt → ordered sentence/score                             | Conjugation, Patterns, Games                         | Catalog/More; touch ordering                  | Strong constructive practice; connection to saved vocab not obvious | Explain production role; **keep**                       |
| Speak & Learn    | Learners recognize but cannot produce speech; spoken use; Use     | Language, microphone/transcript, vocab → feedback and conversation state               | My Vocab, Tutor-like practice, Dashboard             | Bottom nav + catalog; strong empty state      | Strong “how to begin” state; must not be crowded by Tutor           | Preserve empty state and safe bottom budget; **keep**   |
| Pen Pal Practice | Learners need meaningful writing; expressive use; Use             | Language, vocab, grammar patterns, typed/handwritten text → feedback and saved letters | My Vocab, Patterns, Dashboard                        | Catalog/More; canvas can be dense on mobile   | Strong authentic synthesis; advanced controls need purpose          | Explain writing outcome; **keep**                       |
| Games Hub        | Practice needs speed and repetition; confidence through play; Use | Progress from multiple games → summaries, achievements, launches                       | Word Match, Conjugation, Sentence Builder, Dashboard | Bottom nav + catalog; card/stat surface       | Strong aggregation; baseline Tutor overlay covered stats            | Reserve bottom strip; **revise/keep**                   |
| Kana             | Japanese learners need script fluency; character use; Use         | Mode, character curriculum, strokes → scores/writing practice                          | Reader furigana, Dictionary                          | Catalog; language-specific but not paid-gated | Strong specialized practice; invisible outside Japanese context     | Keep reachable and explain language relevance; **keep** |

### Grow and orient

| Tool                     | Problem / reason / stage                                                 | Receives → produces                                                        | Connection                                    | Entry / mobile                                              | Strong / confusing                                                     | Change / disposition                                          |
| ------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| Dashboard                | Learners need feedback and a next step; progress awareness; Grow         | XP, streaks, achievements, activity state → summaries                      | Every scored learning activity                | Bottom nav + catalog; card grid                             | Strong progress overview; Tutor overlay covered bottom cards           | Safe bottom budget + purpose line; **revise/keep**            |
| Complete Toolkit / Guide | Broad system needs explanation; orientation; Grow                        | Active module, progress, registry metadata → catalog, tour, suggested flow | All registered tabs and personalization       | Secondary entry action + catalog; long but scannable mobile | Strong module-aware flow; baseline appeared before product magic       | Move after Reader value; add full catalog; **revise/keep**    |
| Specialty Modules        | Learners need profession relevance; specialization selection; Specialize | Search/category, subscription and purchased state → active module          | Reader focus, Tutor module prompt, Field Prep | Guide/catalog + module picker; scrollable cards             | Strong breadth and real context effect; could feel like required setup | Keep optional after trial and preserve gates; **revise/keep** |

### Module-gated specialty tabs

| Tool                 | Problem / reason / stage                                                   | Receives → produces                                               | Connection                             | Entry / mobile                               | Strong / confusing                                                 | Change / disposition                                 |
| -------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| Missionary           | Field language for missionary work; specialized readiness; Specialize      | Mission module, language, assignment → lessons/map/practice       | Discussions, Reader, Tutor, Field Prep | Missionary module gate + catalog unlock path | Rich purpose-built domain; should not define universal entry       | Preserve gate and explain path; **keep**             |
| Discussions          | Structured teaching conversations; missionary rehearsal; Specialize        | Topic, investigator, language → roleplay and feedback             | Missionary, Tutor-like AI, progress    | Missionary module gate + catalog path        | Strong authentic structure; inaccessible without context by design | Preserve gate; **keep**                              |
| Orthopedics          | Accurate clinical communication; specialist practice; Specialize           | Ortho module, area, language → clinical scenarios/tools           | Anatomy, Tutor module context, Reader  | Orthopedics module gate + catalog path       | Deep specialist content; not universal                             | Preserve gate; **keep**                              |
| Anatomy              | Body-structure terminology; clinical visual recall; Specialize             | Anatomy labels/language → quiz answers                            | Orthopedics and clinical vocab         | Orthopedics gate + catalog path              | Strong visual specificity; baseline entry point obscure            | Document unlock path; **revise/keep**                |
| Field Prep           | Real-world conversation rehearsal; situational readiness; Specialize       | Active supported module, area, language → AI scenario exchanges   | Module, Tutor context, Speak           | Supported-module gate + catalog path         | Strong role relevance; generic label changes by module             | Preserve gate and dynamic purpose; **keep**          |
| Soccer               | Field commands and tactics; coaching use; Specialize                       | Soccer module, language, team/news state → drills/games/news      | Games, Tutor, Field Prep               | Soccer module gate + catalog path            | Rich domain surface; hidden unless active                          | Preserve gate; **keep**                              |
| Baseball             | Positions and game-day communication; sport use; Specialize                | Baseball module, language → lessons/position games/news           | Games, Tutor, Field Prep               | Baseball module gate + catalog path          | Strong domain practice; hidden unless active                       | Preserve gate; **keep**                              |
| OR & EVS             | Sterile-field and hospital support communication; clinical use; Specialize | OR/EVS module, language → scenarios and vocabulary                | Field Prep, Tutor context              | OR & EVS module gate + catalog path          | Clear high-stakes domain; must not imply medical advice            | Preserve gate and learner-language purpose; **keep** |
| FMG Clinical English | International physicians need US clinical English; work use; Specialize    | FMG module, role/area, language direction → coached scenarios     | Tutor module prompt, Field Prep        | FMG module gate + catalog path               | Strong English-target specialization; entry label was opaque       | Expand label/purpose in catalog; **revise/keep**     |
| Rock Climbing        | Safety and gear language; outdoor use; Specialize                          | Climbing module, language → commands, matching, medical scenarios | Tutor, Field Prep                      | Rock Climbing module gate + catalog path     | Rich authentic contexts; baseline route was difficult to discover  | Preserve gate; **keep**                              |
| Sport Fishing        | Gear, conditions, and water communication; outdoor use; Specialize         | Fishing module, language → scenarios and reference content        | Tutor, Field Prep                      | Sport Fishing module gate + catalog path     | Strong niche depth; baseline route was difficult to discover       | Preserve gate; **keep**                              |

Count: 6 Understand + 5 Remember + 6 Use + 3 Grow/orient + 11 module-specialty =
**31 registered tabs**.

## Non-tab learner surfaces — 5

### Word Card

- Intended learner problem: dictionary meanings lack sentence-specific nuance.
- Why Toby likely built it: it is the reveal inside the original Reader interaction.
- Learning stage: Understand.
- Receives: selected word, full containing sentence, language, pointer position.
- Produces: definition, pronunciation, contextual nuance, examples, Tutor handoff, save action.
- Connects to: Reader, Tutor, My Vocab, Flashcards, speech.
- Current entry point: tap a word in Reader or another clickable reading.
- Mobile usability: fixed card now clamps to viewport width and scrolls within 80vh.
- Already strong: rich “In this sentence” explanation.
- Confusing: baseline Tutor context was prose-only and action targets were small.
- Recommended change: structured context, action hint, 44px actions, visible save continuity.
- Disposition: **revise/keep**.

### Tutor panel

- Intended learner problem: learners need follow-up explanations about current material.
- Why Toby likely built it: continue naturally from a clicked Reader word.
- Learning stage: Understand → Use.
- Receives: word, sentence, passage, language, level, explanation, module, vocab, patterns, thread.
- Produces: streamed contextual answers and progress counters.
- Connects to: Reader, Word Card, modules, My Vocab, Grammar Patterns.
- Current entry point: Word Card Ask Tutor or floating Tutor action.
- Mobile usability: fixed panel; now budgeted above bottom nav with visible structured context.
- Already strong: rich existing module and prior-message payload.
- Confusing: baseline structured word came from speech state and passage was sentences 1–4.
- Recommended change: thread-bound Reader context and visible context strip.
- Disposition: **revise/keep**.

### Onboarding / profession selection

- Intended learner problem: content should reflect level and real-world goal.
- Why Toby likely built it: make the large specialty library relevant.
- Learning stage: Orient/Specialize.
- Receives: profession/module and self-reported level.
- Produces: persisted level, active/purchased module, module-aware Tutor prompt.
- Connects to: Modules, Reader focus, Tutor, Field Prep.
- Current entry point: optional personalization from Complete Toolkit; no longer blocks Reader.
- Mobile usability: full-screen three-step cards, skippable.
- Already strong: clear role cards and real personalization.
- Confusing: baseline gate demanded decisions before value and routed explorers to Guide.
- Recommended change: Reader-first entry, optional setup afterward, return to Reader.
- Disposition: **revise/keep**.

### Progress-saving surface

- Intended learner problem: local guest progress can be lost across devices.
- Why Toby likely built it: convert earned value into durable cross-device continuity.
- Learning stage: Grow.
- Receives: auth state, dismissal state, successful learning-action event.
- Produces: compact sign-in action or persistent dismissal.
- Connects to: Auth without changing auth architecture.
- Current entry point: one-line chip after a successful save, never on cold load.
- Mobile usability: one 44px line, under 6% of an 844px viewport.
- Already strong: baseline dismissal persistence.
- Confusing: baseline prompt appeared before learning and occupied too much attention.
- Recommended change: post-value eligibility and Word Card suppression.
- Disposition: **revise/keep**.

### My Vocab saved-word surface

- Intended learner problem: important personal words need a durable practice path.
- Why Toby likely built it: make discovery feed recall instead of ending at lookup.
- Learning stage: Remember.
- Receives: saved Word Card items and generated personal vocabulary.
- Produces: the `state.userVocab` collection and Flashcard candidates.
- Connects to: Word Card, Flashcards, Tutor, Speak, Patterns, Word Match, Pen Pal, other drills.
- Current entry point: save confirmation and My Vocab deck inside Flashcards; no new TabKey.
- Mobile usability: save confirmation offers a direct Flashcards action.
- Already strong: shared state is reused by many tools.
- Confusing: the real collection lacked a clearly named upstream destination.
- Recommended change: name it in place and show “ready in Flashcards”; no architecture rewrite.
- Disposition: **revise/keep**.

## Recorded product decisions

- Default sample: `seed-es-travel-train-ticket`, A1. It is short, natural, neutral, has at least
  ten tappable sentences, uses the default Spanish language, and avoids advanced literary syntax.
- Primary mobile navigation remains curated. The complete catalog explains and reaches all
  registered surfaces; no `TabKey` was added.
- Specialty access gates remain unchanged. Locked catalog actions route to Modules rather than
  opening gated surfaces.
- My Vocab remains the existing `state.userVocab` collection surfaced in place and in
  Flashcards.
- The ivory/midnight/gold system remains; semantic accents identify learning activity while
  labels continue to carry meaning.
