# PRD: Verb Games module — app.languagethreshold.com

> Built by TAC
> Date: 2026-10-20. Sources: `brief.md` (owner brainstorm) and `survey.md` (codebase at 853664a). Repo paths are in `/Users/drive/lt-worktrees/t4d`.
> Labels: **Owner** = decided by Toby. **Assistant** = stated to the owner, not objected to; builder may adjust. **Proposed** = this PRD's recommendation; needs a yes.

## Decision log

| Decision | Who | Status |
|---|---|---|
| Pattern-first practice; crossover membership; swap-in frames | Owner | Decided |
| Six steps as in lessons (See, Hear, Recall, Type, Say, Write); English beside every form | Owner | Decided |
| Verb sources: learner's module verbs + common core set | Owner | Decided |
| Four games: Verb Tetris, Verb Crush, Bubble Pop, Verb Fishing; open anytime | Owner | Decided |
| Top 10 per game (points or time), app-wide, plus an overall board | Owner | Decided |
| Verb Cards deck + one-tap Send to Flashcards | Owner | Decided |
| Dark navy + gold, Playfair titles, mono-caps eyebrows (mockups) | Owner | Approved |
| One shared loop; each game a skin | Assistant | Accepted, adjustable |
| No pause on mistakes; ~1 s reason; recap with Send to cards; 60–90 s rounds; streak multiplier | Assistant | Accepted, adjustable |
| Display name never email; kids off public boards; weekly + all-time | Assistant | Accepted, adjustable |
| Replace vs keep Conjugation tab and Listening Drill | Owner | **Open** |
| Nav placement | Owner | **Open** (PRD proposes Games sub-area) |
| Tense order after present | Owner | **Open** (PRD proposes preterite, future, conditional) |
| Languages beyond Spanish | Owner | **Open** (PRD proposes Italian in Phase 3) |
| Pattern data compiled at build time with a signed review report, no runtime AI | Proposed | Needs yes |
| Server-side score validation by replaying a round log | Proposed | Needs yes |
| Phase 1 = engine + Crush + Bubble Pop; card sync deferred to Phase 2 | Proposed | Needs yes |

---

## 1. Summary

Verb Games is a new area where learners drill Spanish conjugation by **pattern** (the -go yo family, e→ie stem changes, regular -ar endings) in short arcade rounds. Four games share one loop: a target form is shown, the learner earns the missing piece, the word completes, its English flashes. Each game is a skin over one engine that owns the timer, scoring, round log, and score submission. Verbs come from the learner's own module lessons plus a core list. Every game has an app-wide Top 10 (weekly and all-time) and an overall Verb Master board, backed by new Supabase tables with server-side validation. Any form can go to a Verb Cards deck or to Flashcards. Spanish present tense ships first; more tenses, games, and Italian follow.

## 2. Why

Verbs are the speaking bottleneck. A roofer who knows "ladder" but cannot produce "I bring" or "we need" cannot make a sentence; verbs must be produced in real time, with nothing to point at. Patterns compress the work: a learner who owns "-go yo forms" owns tengo, hago, pongo, salgo, vengo, digo at once and recognizes the pattern in new verbs. The owner's instruction is explicit: find more patterns, progress the learner across them.

The learner gets rounds that fit a lunch break, verbs from their own lessons, English on every form so each change has a meaning, a visible ladder of patterns, a place on a board, and cards that carry forms into spaced review.

**Success criteria.** There is no baseline: the app has no server-side game stats (survey item 5). Instrumentation ships in Phase 1 and the first four weeks set the baseline; targets are relative to it.

| Metric | Measured by | Working looks like |
|---|---|---|
| Rounds per active learner per week | `verb_rounds` per user per ISO week | Rising over the first 8 weeks; one-round players come back |
| 7-day return to Verb Games | Users with a round in week N and N+1 | Higher than the existing Conjugation game once it is instrumented the same way |
| Verb accuracy over time | Correct / total picks per family per learner, from round logs | Per-family accuracy climbs over a learner's first 10 rounds in that family; flat means a content or distractor bug |
| Cards sent | Send-to-cards actions per round | Non-zero for a meaningful share of rounds with a miss |
| Pattern coverage | Distinct families with a mastered verb per learner | Learners move past regular -ar |
| Wrong forms accepted | Tests plus in-round "this is wrong" reports | Zero; any case is a P0 |

## 3. Users and moments

- **Roofing crew member, phone, lunch.** Five minutes, one hand, sunlight. Big targets, high contrast, rounds that end themselves, no sound needed. Verbs from the roofing module (cortar, subir, traer, necesitar).
- **Traveler, airport.** Longer sessions; wants variety and reasons to return: boards, levels, new families.
- **Nurse, between shifts.** Precision; "you have" vs "he has" is a safety habit. Wants the reason on every miss and cards for later.

All mostly on phones (brief). Desktop must work but is secondary.

## 4. Goals, non-goals, anti-goals

**Goals.** Faster, more accurate present-tense forms across more families. Playable within 10 s of opening, no lesson prerequisite. One engine so a new skin costs days. English and family on every form. Boards that cannot be trivially faked and never expose a child or an email.

**Non-goals.** Multiplayer. Runtime AI-generated verb content. Rewriting lesson `VerbPractice.tsx` (games link to it). Non-Spanish in Phase 1. Subjunctive, imperative, compound tenses before Phase 3.

**Anti-goals (failure even if it works).** A game that ever accepts a wrong form or shows a wrong gloss. Distractors that are random letters and teach nothing. A board showing a kid's name, an email, or an abusive handle. A board topped by a script. Motion that makes someone put the phone down. Six games, four tenses, three languages in one release.

## 5. Core loop

1. **Target.** A frame plus a meaning: "yo ___go · I come (venir)" or "I leave early · salir · yo". In Tetris the frame is the row being built.
2. **Earn the piece.** Swap a tile, pop a bubble, cast at a fish, drop a block. The piece is an ending (-go), letters (ie), or a whole form (vengo).
3. **Complete.** ven + go = **vengo**, highlighted.
4. **English flashes.** "vengo · I come", about 1 s, play continues.

A round is scoped to one family or a mix. The frame is the family's invariant ("yo ___go"; "e → **ie** except nosotros") and verbs are swapped in without the frame changing: "Mañana ___go temprano" takes salgo, vengo, tengo. **Crossover:** tener is -go (tengo) and e→ie (tienes); in a -go round it contributes its yo form, in an e→ie round its tú/él/ellos forms, and a mixed round can ask for both. Membership is a set, not a tag.

## 6. Pattern model

```ts
type Tense = "present" | "preterite" | "imperfect" | "future" | "conditional";
type Person = "yo" | "tú" | "él_ella_usted" | "nosotros" | "ellos_ustedes"; // = SPANISH_FORM_KEYS

interface PatternFamily {
  id: string;            // "es.present.go-yo"
  language: "es"; tense: Tense;
  kind: "regular-ending" | "yo-irregular" | "stem-change" | "spelling-shift" | "whole-irregular";
  label: string; rule: string;         // 'The "-go" family' / "The yo form ends in -go. Everything else stays regular."
  appliesTo: Person[];                 // stem-change: all but nosotros
  frame: { person: Person; template: string };   // "yo ___go"
  pieceKind: "ending" | "letters" | "whole";
  tier: 1 | 2 | 3;
}
interface VerbForm {   // extends MorphForm {full, stem, ending, irregular?, irregularNote?} from dictionary/types.ts
  infinitive: string; person: Person; tense: Tense;
  full: string; stem: string; ending: string; english: string;   // "I come"
  families: string[];                  // crossover membership for this form
}
interface VerbEntry { infinitive: string; english: string; families: string[];
  sources: ({kind:"module"; moduleId:string} | {kind:"core"; rank:number})[]; forms: VerbForm[]; }
```

**Families, Spanish present.**

| Kind | Families | Piece |
|---|---|---|
| Regular ending | -ar, -er, -ir | ending |
| Yo irregular | -go (tener, hacer, poner, salir, venir, decir, traer, caer, oír); -zco (conocer, parecer, conducir); -oy (dar, estar, ir, ser) | ending |
| Stem change | e→ie (tener, venir, querer, pensar, empezar); o→ue (poder, dormir, volver; jugar u→ue); e→i (decir, pedir, servir, seguir) | letters |
| Spelling shift | -ger/-gir → -jo (escoger, dirigir); -guir → -go (seguir); -uir → -uyo (construir) | letters |
| Whole irregular | ser, estar, ir, haber, saber, ver, dar | whole |

The same taxonomy repeats per tense in Phase 2 (preterite: regular endings, u-stem tuve/pude, j-stem dije, -car/-gar/-zar shifts; future and conditional share one irregular-stem family). New tenses add rows; the model does not change.

**Progression.** Tier 1 = regular endings and -go; Tier 2 = stem changes, -zco, -oy; Tier 3 = spelling shifts and whole irregulars. A family is mastered at a per-family accuracy threshold over a minimum pick count (proposed 85% over 30 picks; builder tunes). Mastery decides what is *suggested* next; nothing is locked, because the owner wants games open. Per-verb mastery inside a family ("3 of 6 verbs mastered") is tracked the same way.

**What exists.** `src/components/dictionary/verbProfiles.ts`: 390 Spanish verbs with `stem`, `irregularType` (stem-change 66, go-verb 18, irregular 15, reflexive-change 3; null = regular) and per-form `MorphForm` for present, imperative, gerund, participle, subjunctive, preterite; `italianVerbProfiles.ts` has 367. `src/lib/conjugate-regular.ts` `conjugateRegular(language, infinitive)` for regular present/past/future/conditional, es/it. `src/data/conjugation-atlas.ts` `IRREGULAR_OVERRIDES`. Lesson verbs `LessonVerb {infinitive, native, forms, example, note?}` in `public/lesson-content/es/*.json`: 635 distinct verbs, present only, five persons, free-text `note` on about half.

**What must be built.**
1. **Pattern compiler** `scripts/build-verb-patterns.mjs`, output committed to `src/data/verb-patterns/es.json`. For each module verb and core verb: forms from lesson JSON (reviewed, authoritative for present); stem/ending by diffing against `conjugateRegular`; `irregularType`/`irregularNote` from `verbProfiles` where a profile exists (~390 of 635); for the other ~245, algorithmic classification (yo form ends -go and regular prediction does not → -go; stem vowel differs → stem-change; and so on). The compiler emits a **review report** of every algorithmically classified verb and every cross-lesson form conflict; a Spanish reader signs it before launch. Free-text `note` is a hint for the report only. Unresolved verbs are excluded from play, not guessed.
2. **English per form.** Lessons have only the infinitive gloss. A small deterministic English conjugator (have/has, do/does, go/goes, am/is/are) emits "I have", "he/she has" into the JSON.
3. **Core list** `es-core.json`: proposed top 100 common verbs, intersected with `verbProfiles` so forms are verified. `known-verb-list.ts` and `frequency-conjugations.ts` (9 verbs) are inputs, not enough alone.
4. **Later tenses (Phase 2).** Preterite from `verbProfiles.phase3` else `conjugateRegular` + `IRREGULAR_OVERRIDES`; future/conditional from `conjugateRegular` plus a 12-verb irregular-stem table. Same review rule.

## 7. Verb sources

**Module verbs** come from `lessons{n}.verbs[]` via the compiler offline; at runtime the engine filters `VerbEntry.sources` by `moduleId`. Core 60 stage files have no `verbs[]`. **Core list** is always available so a learner without a module has a full game; the picker shows "Your module · 38 verbs" and "Core · 100 verbs".

**Dedupe.** 7,196 occurrences → 635 infinitives, keyed on lowercase NFC infinitive with reflexive -se stripped and flagged. Form disagreements across the 63 modules go to the review report; `verbProfiles` wins where present.

**Tense scope.** Present only in Phase 1. Order after that is the owner's (open). Proposed: preterite (what happened on site today), future, conditional, imperfect. Each is a content drop, not an engine change.

**Languages.** Spanish first (Owner). Italian needs: a core list, per-form English, the compiler run on `italianVerbProfiles.ts` + Italian `conjugateRegular`, and Italian families (-are/-ere/-ire, -isc-, essere/avere/andare/fare). English as a target (fmg, or-evs; `ENGLISH_FORM_KEYS`) has one real present pattern (third-person -s plus a few irregulars), so a ladder is thin; recommend Bubble Pop and Fishing with whole-form pieces only, and only on demand.

## 8. The games

**Shared rules.** Rounds 60–90 s (Assistant; builder tunes). Speed ramps within the round. Streak multiplier ×1–×8, reset on a miss. Every piece in play is the one correct answer or a **distractor** from the engine's generator:

| Distractor | salir · yo example | Why tempting |
|---|---|---|
| Regularized irregular | salo | What a learner who skipped -go writes |
| Wrong person, same verb | sale, salimos | Right verb, wrong ending |
| Right family, wrong verb | vengo, tengo | Pattern learned, verb confused |
| Misplaced stem change | peinso | Letters in the wrong slot |
| Near-neighbor word | saldo | Spelling slip |

Every candidate is checked against the full table: anything equal (NFC) to the correct answer or to any valid form of the target verb for the target person is rejected. Unit tests enforce this over the whole dataset.

**Accessibility, all games.** `prefers-reduced-motion` removes falling, swimming, bobbing; pieces fade in place and the timer still runs. Pieces are encoded by **shape and label, not color alone**: stems are rounded rectangles with a trailing hyphen ("ven-"), endings are left-chevron tiles with a leading hyphen ("-go"), whole forms are pills; the mockup colors (grey stem, gold ending, blue whole, green done) sit on top. Each piece has an `aria-label`; a live region announces the target, each completion with English, and each miss with its reason. **List mode** (screen reader or keyboard) presents the frame as a four-option list, scores normally, and is excluded from public boards (flagged in the round log).

### Verb Crush (Phase 1)
- **Pitch.** Swap tiles on a 5×5 board until a stem sits beside its ending and the word pops.
- **Board.** 5×5 of stems ("com-", "ten-") and endings ("-o", "-go"). A stem immediately left of a valid ending **for the level goal** pops both, shows "como · I eat", and refills (fade under reduced motion).
- **Controls.** Phone: tap tile, tap neighbor, or drag. Desktop: click-click or drag; arrows + Enter.
- **End.** Goal reached = win; moves or timer exhausted = round ends with partial credit. Levels are goals, not timers.
- **Scoring.** Points: pop 50 × streak; chain pops multiply. Ranked per level by points, tiebreak fewer moves.
- **Ramp and levels.** Level 1: "Make 5 yo forms", one family, 20 moves. Level 2: 6 forms across two persons. Level 3: a crossover goal ("make tengo and tienes"). Level 4+: more persons, fewer moves, whole-form irregular tiles matched to an English tile. A level is a `{familyIds, persons, goalCount, moveBudget}` row stored beside the pattern JSON; boards are per level.
- **Distractors.** About a third of adjacent pairs are seeded to form a plausible invalid word (ten + o); they never pop; swapping into one shows the reason and costs the streak, not a move.
- **Accessibility.** Shape + label per tile, focus ring, keyboard swap, live-region pops.

### Bubble Pop (Phase 1)
- **Pitch.** Bubbles rise carrying endings and forms; pop the one the frame needs.
- **Board.** Frame at top ("yo ___go · I come · venir"); 4–6 bubbles, exactly one correct; pop completes the word with English, next frame appears.
- **Controls.** Tap; click or keys 1–6.
- **End.** 60 s timer. A correct bubble escaping off the top is a miss.
- **Scoring.** Points: 100 × streak, small speed bonus.
- **Ramp.** Speed and count rise; after 30 s frames become sentences ("Mañana ___go temprano · I leave early").
- **Distractors.** Per the table; always one regularized form when the target is irregular.
- **Levels.** Family picker only.
- **Accessibility.** Reduced motion: bubbles hold still in a row. Reference implementation for list mode.

### Verb Tetris (Phase 2)
- **Pitch.** Drop stems, endings and whole forms; rows clear when they complete a pattern.
- **Board.** 6 wide × 10 tall. Single tiles: stem, ending, letters, or whole form. An ending dropped on a stem's right edge fuses into a whole form. A row clears when all tiles are whole forms of **one family** (all -go) or **one verb across persons** (tengo, tienes, tiene, tenemos, tienen); the English for each form flashes ("I have · I do · I put · I come").
- **Controls.** Phone: swipe left/right, tap to flip stem-side, swipe down to drop, hold to soft-drop. Desktop: arrows, space.
- **End.** 90 s timer, or overflow ends early.
- **Scoring.** Points: fuse 10 × streak, row 100 × streak, double row 300. Invalid fusion (ven + o) lands as rubble, costs the streak, shows the reason.
- **Ramp.** Fall speed up every 15 s; distractor share 30% → 50%; late irregular whole forms.
- **Distractors.** Endings valid for another family; stems with no mate in the well.
- **Levels.** Presets: one family, two crossover families, mixed.
- **Accessibility.** Reduced motion: piece waits at the top, tap a column to place it.

### Verb Fishing (Phase 2)
- **Pitch.** Read the prompt, aim, cast at the right fish, miss the wrong ones.
- **Board.** 4–6 fish at different depths and speeds, one correct; big gold fish carry harder forms and score more. Prompt: "Catch: 'I leave early' · salir · yo · present".
- **Controls.** Phone: drag to aim (line shows angle), release to cast; simple mode taps the fish. Desktop: mouse aim + click; arrows + space.
- **End.** 75 s. A wrong hook shows the reason, costs the streak, reels in empty.
- **Scoring.** Points: small fish 100, big 250, × streak; HUD shows big-fish count.
- **Ramp.** Speed, count, depth rise; later prompts hide the infinitive ("I leave early · yo").
- **Distractors.** Fish are distractors; at least one regularized form (salo) per the mockup.
- **Levels.** Family picker plus a hide-infinitive toggle.
- **Accessibility.** Reduced motion: fish hold position, tap-to-catch. Size classes differ by shape, not only color.

**Later skins.** Snake (eat endings in person order; a wrong ending shortens the snake) and Breakout (bricks are forms; wrong bricks are indestructible) run on the same engine and data. Not before Phase 3.

## 9. Mistakes and feedback

Assistant's call, accepted, adjustable. Play never pauses. The wrong piece shakes (dims under reduced motion), the streak resets, and a one-line reason shows for about 1 s in a fixed band under the HUD: "salo ✗ → **salgo** · salir is a -go verb: the yo form ends in -go." The text comes from `PatternFamily.rule` plus `irregularNote`; no AI call. Each miss is appended to the round log.

**Recap:** score, best streak, personal best, board placement, then misses grouped by family with the correct form and English; "Send to cards" per row and "Send all"; then "Play again", "Practice this family" (opens the six-step unit), "Back".

## 10. The six-step practice tie-in

Each family has a unit page (mockup `verbs-unit.html`): eyebrow, Playfair title, the rule, the family's verbs with English per form, a mastery meter, and the ladder: **See it** (table), **Hear it** (TTS per form), **Recall it** (tap the right form from four; Bubble Pop's frame, static), **Type it** (type the form from the English; reuses VerbPractice's type-each-form), **Say it** (existing speech check), **Write it** (typed dictation: hear the form, type it, English beside the answer; new, small, nothing like it exists today).

Games and practice connect both ways: the recap's "Practice this family" opens the unit at the first unfinished step; the unit's "Play a game" opens the picker pre-selected. Mastery is one number fed by game picks and step completions. Phase 1 ships See / Hear / Recall so the recap has somewhere to send the learner; Type / Say / Write land in Phase 2.

## 11. Leaderboards

**Boards.** Per game × scope (family, or Crush level), weekly (ISO week, UTC) and all-time, Top 10. One overall **Verb Master** board: sum of each learner's best weekly score per game, normalized to that week's top score per game so points and time games compare. Phase 1–2 games rank by points; time-ranked variants (fastest Crush level clear) are a Phase 3 option. App-wide (Owner).

**Data model (Proposed).**

```sql
verb_rounds (id uuid pk, user_id uuid not null references auth.users, game text, scope text,
  language text, tense text, score int, duration_ms int, picks int, correct int, best_streak int,
  reduced_motion bool, list_mode bool, client_round_id uuid unique, round_log jsonb, created_at timestamptz)
verb_best (user_id, game, scope, period text /* 'all' | '2026-W43' */, score, round_id, pk(user_id, game, scope, period))
verb_leaderboard_names (user_id pk, handle text unique, status text /* ok | pending | blocked */, updated_at)
```

RLS follows the repo's restrictive style (team_platform migration): revoke from anon and authenticated; `verb_rounds` and `verb_best` have no client policies; reads go through a `security definer` RPC `verb_top10(game, scope, period)` returning handle, score, rank only, excluding non-`ok` handles and users with `raw_user_meta_data->>'is_kid' = 'true'`. `verb_leaderboard_names` allows own-row select.

**Submission.** `src/fns/verb-score.functions.ts`, shaped like `src/lib/team-server.ts` (service-role client, bearer `getUser`, `json()`, `audit()`), receives `{clientRoundId, game, scope, roundLog}`, validates, **computes the score itself**, writes `verb_rounds`, upserts `verb_best`, returns placement. The client never writes a score.

**Anti-cheat.** The round log (`{t, frame, piecesShown[], picked, correct}` events) is the source of truth: the server replays it through the same `scoring.ts` the client uses and ignores the client's number. Plausibility bounds per game: minimum interval between picks, maximum picks per round length, duration within the game's window, streak consistent with the pick sequence, frames reproducible from the declared scope and seed against the pattern JSON. Rate limits in the function (proposed 6/min, 300/day). Soft failures and list-mode rounds are stored for personal history but kept off public boards; hard failures set handle status `blocked`, reversible by an owner RPC.

**Display names.** A new public handle, chosen on first submit, 3–20 chars, letters/digits/underscore, unique case-insensitively. Never email; never `user_metadata.display_name` by default (it may hold a real name). Moderation: block-list on save, "Report name" on every board row (threshold → `pending`), owner review. Pending and blocked show as "Learner".

**Kids.** `is_kid` is set by `api.family-add-kid` and read by nothing today. Both the RPC and the function check it: a kid's rounds and personal bests work, the board is visible, but their row never appears publicly and they cannot set a handle. The survey notes an auth hole in `api.family-add-kid` under a separate ticket; public boards depend on `is_kid` being trustworthy, so that fix is a prerequisite, not part of this scope.

**Offline.** The round scores locally; submission is queued in the learner-device store and flushed on reconnect or next open, idempotent on `client_round_id`. Guests keep device-only bests and see "Sign in to join the board".

## 12. Verb Cards

**Deck.** A dedicated Verb Cards deck in Flashcards. Front: the form. Back: English, family pills ("-go yo form", "e → ie"), and the verb's full table with English per row (the tener card in `verbs-unit.html`). Cards are `FlashcardEntry` rows (`src/state/flashcard-state.tsx:50`) with `category: "conjugated"`, `word: form`, `translation: english`, example from the lesson verb, `moduleId` when applicable. Pills and table render from the pattern JSON by infinitive at view time; add an optional `verbKey` field only if the lookup proves slow.

**Send to Flashcards** uses `addCard()` from `useFlashcards()` and `dispatch({type: "ADD_VOCAB_ITEMS"})` exactly as `GlobalVocabCapture.tsx` and `LessonPracticeKit.tsx` do: from the recap (per miss or all), from the unit ("Add family to cards" adds every form of every verb), and from any completed form in a game via long-press or right-click without pausing.

**Sync.** Cards are device-only today (`useLearnerDeviceStore`, localStorage; no Supabase cards table). **Proposed:** stay device-only in Phase 1; ship sync in Phase 2 as a Flashcards-wide feature, since conflict and SRS-merge rules affect every deck. The recap says "Saved on this device".

## 13. Placement and navigation

**Owner decision needed.**

- **Option A — sub-area of Games.** A "Verbs" section at the top of `GamesHub.tsx` with the four game cards and the pattern ladder; games and the unit reachable as sub-routes under `?tab=games`. No change to `APP_TABS`, `TOOL_CATALOG`, `TAB_COMPONENTS`, TopNav, sidebar, or the full six-slot mobile `BAR_TABS`.
- **Option B — new top-level Verbs area.** Adds an `APP_TABS` entry plus registry, TopNav, sidebar, and a mobile-bar decision (which slot gives way, or a seventh in More). Stronger statement that verbs are core; more churn.

**Recommendation: A for Phases 1–2**, with Games opening on the Verbs section by default and a Verbs link in More. Revisit B with usage data; moving a bar slot without data is a guess.

**Existing games.** Recommendation: keep the Conjugation game and Listening Drill through Phase 1; fold the Conjugation game into Verb Games in Phase 2 (its AI multiple-choice across all tenses is superseded once more tenses exist, and `ConjugationLeaderboard.tsx` is fake data that should not sit beside a real board). Listening Drill is phrase-level, not verb-specific: keep it. Owner's call.

## 14. Visual direction

From the approved mockups: background `#0a1220`, panels `#111a2b` with `#1f2a3d` borders, gold `#c9a646` / `#e6c35c` for eyebrows, endings and CTAs, text `#f4f1e8`, muted `#9aa3b2`. Playfair Display titles ("Snap the ending on"), mono-caps eyebrows with wide tracking ("GAME · VERB CRUSH · LEVEL 1"), mono HUD ("SCORE 2,060 STREAK ×6 0:39"). Pieces: stems grey `#c9d3e0`, endings gold, whole forms blue `#7fb2e5`, completed green `#8fd1a8`, always paired with the shape encoding. Miss band `#2a1414` / `#7a3b3b`. Inter stays body-only.

Screens: (1) **Verbs home** in Games: pattern ladder as a two-column family grid with meters, then four game cards with personal best and weekly rank. (2) **Picker**: family or mix, verb source (module / core / both), Crush levels with goals, Start. (3) **Game**: HUD, board, fixed reason band, legend ("stem · ending / letters · whole form"). (4) **Recap**. (5) **Leaderboard**: Weekly / All-time tabs, game and scope selectors, Top 10, your row pinned below if outside, Report name. (6) **Pattern unit** as mocked, with the ladder and "Add family to cards" / "Play a game". (7) **Verb Card** back with tense selector (Present; Past · Future greyed until Phase 2).

## 15. Technical design notes for the builder

**Engine** `src/lib/verb-games/engine.ts`, framework-free TypeScript. `createRound({game, scope, verbs, seed, durationMs, reducedMotion, listMode})` → `{nextFrame(), pick(pieceId, t), tick(t), end()}` with a seeded RNG so the server can replay. `scoring.ts` is a pure function of the round log, imported by client and server. Hooks `onComplete`, `onMiss`, `onRoundEnd`; `submit(result)` queues and calls the function. `distractors.ts` `forFrame(frame, verbs, n)` with the rejection rule. `patterns.ts` lazily imports `src/data/verb-patterns/es.json` (a few hundred KB). Each game is a React component that renders engine state and owns input and animation only.

**State.** Local: `useLearnerDeviceStore("verb-games")` for mastery, personal bests, the unsubmitted queue, and settings. Server: the three tables. Nothing new in `profiles.data`.

**Performance.** Floor is a mid-range Android. Crush and Bubble Pop: DOM with `transform`/`opacity` only (25 tiles, 6 bubbles). Tetris and Fishing: 2D canvas for the board, DOM for HUD and reason band; `requestAnimationFrame`, paused on `document.hidden`, stopped between frames under reduced motion. Target 60 fps, floor 30; measure with a throttled DevTools trace before each phase sign-off. No audio engine; TTS is the only sound.

**TTS.** `speakRemote(text, "es-ES", {usage: "learning", signal})` from `src/lib/tts.ts` for Hear it and an optional say-on-complete toggle (off by default in games); `stopRemoteTTS()` on round end.

**Tests.** Unit (`tests/verb-patterns.test.mjs`, `verb-distractors.test.mjs`, `verb-scoring.test.mjs`, via `npm test`): every verb has all five persons; every family's verbs satisfy its rule against the regular prediction; the generator never returns the correct form or any valid form of the target verb/person, over every frame in the dataset; scoring replay matches recorded scores; constructed cheat logs are rejected. Server (`tests/verb-score-function.test.mjs`): tampered score corrected, kid stored but excluded from `verb_top10`, rate limit trips. E2E (`e2e/verb-games.spec.ts`, in `npm run smoke:e2e` desktop and `--phone`): Games → Verbs → Crush level 1 → one pop with English → recap → send a card → open board; same for Bubble Pop; Tetris and Fishing added in Phase 2; one reduced-motion run per game.

**Security.** `team-server.ts` pattern throughout; migrations in `supabase/migrations/` in the existing restrictive RLS style.

## 16. Phasing

**Phase 1 — smallest lovable slice.** Engine; compiler and review report; Spanish present with regular -ar/-er/-ir, -go, e→ie, o→ue, e→i; module + core verbs; Verb Crush levels 1–4 and Bubble Pop; reason band and recap; Send to Flashcards and the device-only Verb Cards deck; unit with See / Hear / Recall; personal best + weekly Top 10 per game and scope, handles, kid exclusion, offline queue; tests above; placed inside Games.

Why this pair: Crush and Bubble Pop are DOM-only, fastest to build, and exercise both piece kinds (swap an ending or letters; pick a whole form) the other games reuse; Bubble Pop is the accessibility reference. Compiler and report first means every later game inherits verified data.

**Phase 2.** Tetris and Fishing (canvas); preterite, then future and conditional; all-time and Verb Master boards; Type / Say / Write with typed dictation; fold in the Conjugation game if agreed; card sync as a Flashcards feature; report-name moderation UI.

**Phase 3.** Snake and Breakout; Italian; time-ranked variants; English-target support on demand.

Data correctness and the shared engine come before breadth; the games with novel rendering (canvas) come after the engine is proven on simple boards.

## 17. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Wrong form taught or accepted | Compiled data, signed review report, profiles preferred over algorithm, dataset-wide distractor test, in-game "this looks wrong" report |
| Cheating | Server replay, plausibility bounds, rate limits, blocked status, list-mode exclusion |
| Kids' privacy | `is_kid` enforced in RPC and function; handles never default to real names; depends on the separate `api.family-add-kid` fix |
| Motion sickness, accessibility | Real reduced-motion per game, shape encoding, live regions, list mode, reduced-motion e2e |
| Non-Spanish content gaps | Data-driven engine; Italian is data plus report; English-target kept small |
| Scope creep | Phase 1 is two games, one tense, five families; skins banned until Phase 3 |
| Mobile performance | DOM in Phase 1; canvas profiled on a throttled device before Phase 2 sign-off |
| ~245 verbs without profiles | Flagged, reviewed, excluded if unresolved |

## 18. Open questions for the owner

1. **Nav placement.** Sub-area of Games (recommended for Phases 1–2) or new top-level Verbs? If top-level, which mobile slot gives way?
2. **Existing games.** Keep Conjugation and Listening Drill, or fold Conjugation in during Phase 2 (recommended) and keep Listening Drill?
3. **Tense order after present.** Proposed preterite, future, conditional, imperfect.
4. **Phase 1 pair.** Crush + Bubble Pop (recommended), or Fishing in Phase 1 since you described it most vividly?
5. **Who signs the verb review report** for the ~245 module verbs without a dictionary profile?
6. **Languages.** Italian in Phase 3; English-target reduced set on demand. Agree?
7. **Handles.** Required to appear on a board (recommended), or allow anonymous "Learner" rows?
8. **Mastery threshold.** 85% over 30 picks proposed, or let the builder tune from data?
9. **Core list size.** Top 100 proposed.
10. **Card sync.** Confirm device-only in Phase 1, Flashcards-wide sync in Phase 2.
11. **Weekly reset.** ISO week UTC proposed; a Mountain-time Sunday reset would suit the crew but complicates the week key.
