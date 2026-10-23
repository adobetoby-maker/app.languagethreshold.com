# Trade packs — module-flavored static content for core areas

Status: ACTIVE (2026-10-23 10:52). Chat's site cleanup is limited to controls and lesson-entry layout and will not touch lesson content, AI calls or offline loading, so packs proceed on feature/trade-packs and merge after the cleanup lands (rebase first).

## Why
Owner: put the selected module's "flavor" into each core area to promote module-driven learning, as a static call to cut cost, speed up, and work offline. Speak/Tutor/Pen Pal/handwriting stay live AI (they respond to learner input). Owner decision: when a pack has nothing for a request, fall back to live AI.

## Today (scout, 2026-10-23)
- Grammar: 3 live Haiku calls (titles per level, lesson content, quiz) in src/fns/grammar.functions.ts; module only used to sort/mark titles (LevelSidebar.tsx:132). Client cache keyed by language+level, not module.
- Conjugation: 5 questions/run, each 2 Haiku calls (generate + review), src/fns/conjugation.functions.ts; topic built from activeModuleId (ConjugationGame.tsx:39). Server cache only hits question 1.
- Sentence Builder: 5 calls/run, no cache, src/fns/sentence-build.functions.ts; topic from module.
- Word Match: 1 board/game, cache misses after first game, src/fns/word-match.functions.ts; topic from module.
- None of these is offline-capable today.

## Design
- Files: public/trade-packs/<langCode>/<moduleId>.json (+ index.json), one section per area: grammar {titles[level], contents[lessonId], quizzes[lessonId]}, conjugation {items[] with level, axisTested, cefr, infinitive}, sentenceBuild {items[] with level, cefr, tokens, targetSentence}, wordMatch {boards[] with level, cefr, topic, pairs}. Split grammar into its own file if size warrants.
- Pool sizes: conjugation ≥ 40 per level×axis, sentence builder ≥ 60 per level, word match ≥ 12 boards per level, grammar A1–B2 full (6 lessons/level, content + 2 quizzes each).
- Loader: clone src/lib/lesson-content.ts (8s timeout, 404→null cached, dedup). Pickers honor each game's `avoid` semantics (infinitive; first 30 chars of sentence; recent topic labels). Skip pack when `userWords` personalization is present (Conjugation, Word Match) — or blend; product call.
- Seams (pack first, then existing server fn): LevelSidebar.tsx:80, LessonView.tsx:81, QuizCard.tsx:87 (wrap in usePackedGrammar), ConjugationGame.tsx:51, SentenceBuilder.tsx:37, WordMatch.tsx:42. Grammar pack lessons use module-namespaced ids so they never pollute the shared per-language store.
- Offline: add /trade-packs/ to public/sw.js stale-while-revalidate clause (bump CACHE), add a /trade-packs/(.*) route before the catch-all in scripts/vercel-adapter.mjs.
- Generator: scripts/build-trade-packs.mts reusing src/lib/claude-cli-runner.ts + cliJsonSchema/cliPrompt/parseCliOutput (Opus on subscription, never an API key), resumable progress, publish only when a module+area fully validates. Export/move the inline validators (TitlesSchema, LessonContentSchema, QuizSchema, ConjugationOutput + review gate, sentence token rules, word-match uniqueness) to src/lib/*-core.ts so server fns and generator share them.
- Content rules: same as Core 60 (neutral LatAm Spanish, ustedes, no universal specs, safety steps).

## Tickets (run in order after re-scope)
- P1 Infra + validators export + loader + SW/route + generator skeleton + Word Match seam + roofing pack (smallest area proves the path).
- P2 Sentence Builder + Conjugation seams and roofing pools.
- P3 Grammar seam (module-namespaced) and roofing grammar pack.
- P4 Packs for gutters + siding (after feature/gutters-siding-core60 merges).
- P5 Remaining surviving areas (listening drill, pattern drill, idioms, false friends, battle) — re-scope after simplification.
- P6 Packs for all other Core 60 trades (generator only, batched overnight).
Each ticket: blind verify, tsc/lint/test/build, smoke, 4-viewport screenshots for UI, then merge.

## Decisions (P1, 2026-10-23)
- Fallback: when a pack has nothing for a request (no file, file unusable, no eligible board for the level and `avoid`), the area runs its existing live AI call. Owner decision.
- Personalization: when `userWords` is non-empty, Word Match still uses the pack. Product call: packs win. Reason: the pack is the free, instant, offline path and the learner's own words are still credited when they happen to appear on a board. The live call is still used for a module with no pack. (Conjugation keeps the spec's "skip or blend" question open for P2.)
- Language pairing: a pack exists only for the default pairing of each target language (Spanish for English natives), the same rule as lesson content (`contentNativeLanguage`). The picker also checks the file's `nativeLanguage` against the learner's.
- Loading: the app prefetches the selected module's pack when the module or language changes. If a game starts while that fetch is still in flight, the game waits for it (the loader's own 8 s timeout bounds it) and then picks.
- Pack format: `public/trade-packs/<langCode>/<moduleId>.json` is `{ version: 1, module, language, nativeLanguage, generatedAt, model, reviewed: false, wordMatch: { boards: [{ level, cefr, topic, pairs }] } }`; `public/trade-packs/index.json` lists every pack with its areas, board counts per level and byte size. The runtime parser is lenient (drops an invalid board); the generator and tests apply the strict pool rules.
- Word Match pool rules: at least 12 boards per level, one topic per board within a level, a target on at most 2 boards of the section, lower-case cards, no slashes or brackets on a card. The shared board validator is `src/lib/word-match-core.ts`.
- Generator: `scripts/build-trade-packs.mts`, subscription CLI only (no API-key provider), Opus by default. Languages: Spanish only until the Word Match UI labels the second face by native language (the field is named `english`).
- Shipped packs are `reviewed: false` until a Spanish reader has gone through them.
