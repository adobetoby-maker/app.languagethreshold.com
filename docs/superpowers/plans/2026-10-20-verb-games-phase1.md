# Verb Games Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Ship a Verbs section inside the Games tab where learners drill Spanish present-tense conjugation by pattern in Verb Crush (levels 1–4) and Bubble Pop, backed by compiled, reviewed verb data, a shared replayable engine, server-validated scores with weekly Top 10 boards behind an off-by-default flag, Verb Cards, and a See / Hear / Recall pattern unit.

**Architecture:** An offline compiler (`scripts/build-verb-patterns.mts`) turns lesson JSON plus dictionary profiles into a committed `src/data/verb-patterns/es.json` and a review report. A framework-free engine under `src/lib/verb-games/` (seeded RNG, frames, distractors, Bubble and Crush rules) records only inputs (picks and swaps with timestamps); the same engine replays the log on the server in `src/routes/api.verb-score.ts`, which computes the score itself and writes through `security definer` RPCs in a new restrictive-RLS migration. React screens under `src/components/games/verbs/` render engine state, routed with `?tab=games&verbs=…` inside `GamesHub.tsx`.

**Tech Stack:** TanStack Start + React 19, TypeScript, Supabase (Postgres RPC + service-role client), Vercel, `node --test` with esbuild bundling (`tests/helpers/bundle.mjs`), Playwright (`npm run smoke:e2e`, desktop + `--phone`), local psql fixtures (`tests/sql/`).

**Spec:** `docs/superpowers/specs/2026-10-20-verb-games-prd.md` (scope narrowed by the owner's Phase 1 decisions in the task brief; survey: `/Users/drive/.taco/missions/verb-games/survey.md`).

## Global Constraints

- No runtime AI for verb content: forms, English, families and reasons come only from `src/data/verb-patterns/es.json`.
- A wrong form is never accepted: Crush pops and Bubble completions happen only on the frame's exact form (NFC-normalized, lower-cased comparison).
- A valid form is never marked wrong: a Crush pair that is a valid present form of any verb is neutral unless it is a goal.
- Spanish present tense only; families exactly `es.present.ar`, `es.present.er`, `es.present.ir`, `es.present.go-yo`, `es.present.e-ie`, `es.present.o-ue`, `es.present.e-i`.
- Persons are `SPANISH_FORM_KEYS` order: `yo`, `tú`, `él_ella_usted`, `nosotros`, `ellos_ustedes` (no vosotros).
- English beside every completed form, every miss, every table row and every card.
- Profile-less ("classified") verbs ship only after the review report is signed (`docs/verb-patterns/es-review-signoff.json` hash matches); unresolved verbs are excluded, never guessed.
- Play never pauses on a miss; the reason shows about 1 s (`REASON_MS = 1200`) in a fixed band.
- Streak multiplier is `min(8, streak)`; a miss resets the streak.
- Never show an email or `user_metadata.display_name`; public names are handles only (3–20 chars, `[A-Za-z0-9_]`, unique case-insensitively).
- Kids (`is_kid` true in any form, or `parent_id` present) never appear on a public board and cannot set a handle; their rounds and personal bests still record.
- Public boards are gated by server env `VERB_PUBLIC_BOARDS`, read only in `src/lib/verb-games/board-flag.ts` (`publicBoardsEnabled`), default OFF; anything other than the exact string `"true"` is off.
- The client never sends a score; the server replays the log through the same engine and ignores client numbers.
- List-mode and soft-failure rounds are stored for history but never ranked.
- `prefers-reduced-motion`: no rising, falling or shaking; pieces fade or dim in place; timers still run.
- Pieces are encoded by shape and label, not color alone: stem `ten-` rounded rectangle, ending `-go` left-chevron tile, whole form pill; colors stem `#c9d3e0`, ending `#e6c35c`, whole `#7fb2e5`, done `#8fd1a8`; miss band `#2a1414` / `#7a3b3b`.
- Theme: existing dark navy + gold tokens (`bg-background`, `bg-card`, `border-border`, `text-gold`), Playfair via `font-display` for titles, mono-caps eyebrows via `font-mono uppercase tracking-[0.22em]`, Inter body only.
- Placement: inside `GamesHub.tsx` under `?tab=games`; no new `APP_TABS` entry; no change to TopNav, sidebar or mobile `BAR_TABS`; Conjugation game and Listening Drill stay.
- Verb Cards are device-only (`useLearnerDeviceStore("flashcards")`); recap says "Saved on this device".
- Modules under `src/lib/verb-games/` use relative imports with explicit `.ts` extensions (like `src/lib/core60-validate.ts`) so scripts and `node --test` import them directly.
- Migrations go in `supabase/migrations/`; never apply them to production (the owner does).
- Never commit `.env*`; full build is `node scripts/with-supabase-public-env.mjs npm run build`.
- Never edit `src/routeTree.gen.ts` by hand; commit the version the dev server/build regenerates.

## Review Focus

1. **Stale pattern data on the client** (PWA cache serves an old `es.json` after a data change): the server's replay diverges and an honest player is treated as a cheater and blocked. Pin: Task 9 `stale data is reported, never judged`; Task 19 `stale round writes nothing and blocks nobody`; Task 20 `queue drops stale rounds`.
2. **Cross-verb homographs and valid non-goal forms** (`sentar` and `sentir` both give `siento`; `com`+`o` = `como` in a -go level): a distractor identical to the answer, or a valid form punished as a trap. Pin: Task 6 `homograph from another verb is never a distractor`; Task 8 `valid non-goal pair is neutral, never a miss`.
3. **Reflexive lesson verbs** (66 of 635 lesson infinitives end in `-se`; forms carry clitics, `me cruzo`): clitics leak into stems or tiles. Pin: Task 3 `reflexive forms never emit clitics`.
4. **Wrong dictionary labels** (`verbProfiles.ts` tags `conocer` as `go-verb`, notes `poder` as `E→UE`; `juego`, `niego`, `sigo` end in `-go`): trusting labels or a naive `-go` rule misteaches. Pin: Task 1 `-go rule ignores stem-change and -guir forms`; Task 3 `profile labels and notes never drive families or reasons`.
5. **Duplicate and cross-user `clientRoundId`** (two tabs flush the same queue; another user reuses an id): double-counted bests, or user B reading user A's result. Pin: Task 17 SQL cases `duplicate round` and `same id, other user`; Task 19 `duplicate returns stored result without a second best`.

## File Structure

Data and compiler
- `src/lib/verb-games/types.ts` — shared types (Person, FamilyId, PatternData, RoundLog, results).
- `src/lib/verb-games/families.ts` — the seven family rows, person labels, reason text.
- `src/lib/verb-games/classify.ts` — regular prediction, per-form family membership, stem/ending split.
- `src/lib/verb-games/english.ts` — deterministic English per person from a gloss.
- `src/lib/verb-games/compile.ts` — pure compiler: lessons + profiles + core → PatternData + review items + report markdown.
- `scripts/build-verb-patterns.mts` — reads repo inputs, writes outputs, `--check` mode.
- `src/data/verb-patterns/crush-levels.json` — Crush level rows (compiler input).
- `src/data/verb-patterns/es.json` — committed compiled data (output).
- `docs/verb-patterns/es-review-report.md` — committed review report (output).
- `docs/verb-patterns/es-review-signoff.json` — reviewer sign-off (owner fills; starts `null`).

Engine
- `src/lib/verb-games/rng.ts` — mulberry32 seeded RNG helpers.
- `src/lib/verb-games/pool.ts` — verb pool by source, frame slots by families/persons.
- `src/lib/verb-games/frames.ts` — frame building and slot sequencing.
- `src/lib/verb-games/distractors.ts` — candidate generation with the rejection rule.
- `src/lib/verb-games/rules.ts` — game constants, scope keys, level availability.
- `src/lib/verb-games/bubble.ts` — Bubble Pop round state machine.
- `src/lib/verb-games/crush.ts` — Verb Crush board and round state machine.
- `src/lib/verb-games/scoring.ts` — replay + validation verdict (client and server).
- `src/lib/verb-games/device.ts` — device state shape, sanitizer, mastery, bests, queue.
- `src/lib/verb-games/verb-route.ts` — `?verbs=` sub-route parse/serialize.
- `src/lib/verb-games/load-patterns.ts` — client lazy loader for `es.json`.
- `src/lib/verb-games/cards.ts` — Verb Card inputs from forms.

Server
- `supabase/migrations/20261020120000_verb_games.sql` — four tables, restrictive RLS, RPCs.
- `tests/sql/verb-games.sql`, `scripts/qa/test-verb-games-db.mjs` — local rollback fixture and runner.
- `src/lib/verb-games/board-flag.ts` — `VERB_PUBLIC_BOARDS` reader.
- `src/lib/verb-games/handle.ts` — handle validation and block-list.
- `src/lib/verb-games/week.ts` — ISO week key and period clamp.
- `src/lib/verb-games/score-server.ts` — submit / board / handle / report logic over an injected db.
- `src/lib/verb-games/server-data.ts` — static `es.json` import for the server.
- `src/routes/api.verb-score.ts` — thin route adapter (team-server pattern).
- `src/lib/verb-games/score-client.ts` — bearer requests, submit-or-queue, flush.

UI
- `src/hooks/use-reduced-motion.ts`, `src/hooks/use-verb-device.ts`, `src/hooks/use-round-clock.ts`.
- `src/components/games/verbs/PieceTile.tsx`, `GameHud.tsx`, `ReasonBand.tsx`, `LiveRegion.tsx`, `Legend.tsx`, `CompletionFlash.tsx`, `FrameChoices.tsx` — shared primitives.
- `src/components/games/verbs/VerbsSection.tsx` — screen router mounted in GamesHub.
- `VerbsHome.tsx`, `VerbPicker.tsx`, `BubblePopGame.tsx`, `VerbCrushGame.tsx`, `RoundRecap.tsx`, `VerbBoard.tsx`, `PatternUnit.tsx` — screens.
- `src/components/flashcards/VerbCardBack.tsx` — Verb Card back with table and tense selector.
- Modify `src/components/games/GamesHub.tsx`, `src/lib/app-navigation.ts`, `src/state/flashcard-state.tsx`, `src/components/flashcards/FlashcardsStudio.tsx`, `playwright.config.ts`, `scripts/smoke-e2e.mjs`.
- `e2e/verb-games.spec.ts` — e2e flows plus the `@screens` 4-viewport capture.
- `docs/verb-games.md` — owner runbook (flag, migration, sign-off, prerequisite).

Tests (all `tests/*.test.mjs`): `verb-classify`, `verb-english`, `verb-compile`, `verb-patterns`, `verb-frames`, `verb-distractors`, `verb-bubble`, `verb-crush`, `verb-scoring`, `verb-device`, `verb-route`, `verb-ui`, `verb-server-helpers`, `verb-score-function`, `verb-score-client`, `verb-cards`; helper `tests/helpers/verb-fixture.mjs`.

---

### Task 1: Pattern types, families and the form classifier

**Files:**
- Create: `src/lib/verb-games/types.ts`, `src/lib/verb-games/families.ts`, `src/lib/verb-games/classify.ts`
- Test: `tests/verb-classify.test.mjs`

**Interfaces:**
- Consumes: `conjugateRegular(language: Language, infinitive: string): ConjugationSet | null` from `src/lib/conjugate-regular.ts` (Spanish `presentTense.{firstSingular, secondSingular, thirdSingular, firstPlural, thirdPlural}`; returns null for `-se` and accented `-ír` infinitives).
- Produces:
```ts
// types.ts
export type Person = "yo" | "tú" | "él_ella_usted" | "nosotros" | "ellos_ustedes";
export const PERSONS: readonly Person[];
export type FamilyId = "es.present.ar" | "es.present.er" | "es.present.ir" | "es.present.go-yo"
  | "es.present.e-ie" | "es.present.o-ue" | "es.present.e-i";
export interface PatternFamily { id: FamilyId; language: "es"; tense: "present";
  kind: "regular-ending" | "yo-irregular" | "stem-change"; label: string; rule: string;
  appliesTo: Person[]; frame: { person: Person; template: string }; pieceKind: "ending" | "letters"; tier: 1 | 2; }
export interface VerbForm { person: Person; full: string; stem: string; ending: string; english: string;
  families: FamilyId[]; sentence: { target: string; native: string } | null; }
export type VerbSource = { kind: "module"; moduleId: string } | { kind: "core"; rank: number };
export interface VerbEntry { infinitive: string; english: string; status: "verified" | "classified";
  sources: VerbSource[]; forms: VerbForm[]; }            // forms in PERSONS order, length 5
export interface CrushLevel { level: 1 | 2 | 3 | 4; label: string; persons: Person[] | "family";
  families: "picked" | FamilyId[]; goalCount: number; moveBudget: number; }
export interface PatternData { version: 1; language: "es"; tense: "present"; dataHash: string;
  reportSha256: string; signedOff: boolean; families: PatternFamily[]; crushLevels: CrushLevel[]; verbs: VerbEntry[]; }
// families.ts
export const FAMILIES: readonly PatternFamily[];
export const PERSON_LABEL: Record<Person, string>;
export function familyById(id: FamilyId): PatternFamily;
export function isFamilyId(value: unknown): value is FamilyId;
export function reasonText(familyId: FamilyId, form: { infinitive: string; person: Person; ending: string }): string;
// classify.ts
export function regularPresent(infinitive: string): Record<Person, string> | null;
export function formFamilies(infinitive: string, person: Person, full: string): FamilyId[];
export function splitForm(infinitive: string, person: Person, full: string, families: FamilyId[]): { stem: string; ending: string };
```
- Pinned values: `PERSON_LABEL = { yo: "yo", tú: "tú", él_ella_usted: "él/ella/usted", nosotros: "nosotros", ellos_ustedes: "ellos/ustedes" }`. Family rows (id → label / rule / appliesTo / frame.template / pieceKind / tier):
  - `ar` → `Regular -ar` / `Drop -ar, add -o, -as, -a, -amos, -an.` / all / `-o · -as · -a · -amos · -an` / ending / 1 (er and ir likewise with `-o · -es · -e · -emos · -en` and `-o · -es · -e · -imos · -en`)
  - `go-yo` → `The "-go" family` / `The yo form ends in -go. Everything else stays regular.` / `["yo"]` / `yo ___go` / ending / 1
  - `e-ie` → `e → ie` / `The stem e becomes ie in every form except nosotros.` / all but nosotros / `e → ie (not nosotros)` / letters / 2; `o-ue` and `e-i` likewise (`o → ue`, rule adds `(jugar: u → ue)`; `e → i`).
- Membership algorithm (body required; R = `regularPresent(inf)[person]`, s = infinitive minus last two letters, compare NFC lower-case):
  1. R null → `[]`. 2. `full === R` → the regular family for the infinitive's ending. 3. person ≠ nosotros and `full === R` with the last `e` of s → `ie` / last `o` → `ue` (for `jugar`: last `u` → `ue`) / last `e` → `i` → that stem-change family. 4. person yo, `full` ends `go`, step 3 matched nothing, infinitive does not end `guir` → `go-yo`. 5. else `[]`.
- `splitForm`: go-yo → `{stem: full.slice(0,-2), ending: "go"}`; otherwise the regular person ending (`o, as|es, a|e, amos|emos|imos, an|en`) when `full` ends with it; else `{stem: full, ending: ""}`.

- [ ] **Step 1: Write the failing test** in `tests/verb-classify.test.mjs`:
```js
import { formFamilies, splitForm, regularPresent } from "../src/lib/verb-games/classify.ts";
import { reasonText, FAMILIES } from "../src/lib/verb-games/families.ts";
test("regular and irregular forms land in the right families", () => {
  assert.deepEqual(formFamilies("hablar", "yo", "hablo"), ["es.present.ar"]);
  assert.deepEqual(formFamilies("tener", "yo", "tengo"), ["es.present.go-yo"]);
  assert.deepEqual(formFamilies("tener", "tú", "tienes"), ["es.present.e-ie"]);
  assert.deepEqual(formFamilies("tener", "nosotros", "tenemos"), ["es.present.er"]);
  assert.deepEqual(formFamilies("poder", "ellos_ustedes", "pueden"), ["es.present.o-ue"]);
  assert.deepEqual(formFamilies("pedir", "tú", "pides"), ["es.present.e-i"]);
  assert.deepEqual(formFamilies("decir", "yo", "digo"), ["es.present.go-yo"]);
  assert.deepEqual(formFamilies("conocer", "yo", "conozco"), []);
  assert.deepEqual(formFamilies("oír", "yo", "oigo"), []);           // no regular prediction
  assert.equal(regularPresent("levantarse"), null);
});
test("-go rule ignores stem-change and -guir forms", () => {           // Review Focus 4
  assert.deepEqual(formFamilies("jugar", "yo", "juego"), ["es.present.o-ue"]);
  assert.deepEqual(formFamilies("negar", "yo", "niego"), ["es.present.e-ie"]);
  assert.deepEqual(formFamilies("seguir", "yo", "sigo"), []);
  assert.deepEqual(formFamilies("seguir", "tú", "sigues"), ["es.present.e-i"]);
});
test("splits pieces and builds reasons from family rules only", () => {
  assert.deepEqual(splitForm("venir", "yo", "vengo", ["es.present.go-yo"]), { stem: "ven", ending: "go" });
  assert.deepEqual(splitForm("tener", "tú", "tienes", ["es.present.e-ie"]), { stem: "tien", ending: "es" });
  assert.equal(reasonText("es.present.go-yo", { infinitive: "salir", person: "yo", ending: "go" }),
    "salir is a -go verb: the yo form ends in -go.");
  assert.equal(reasonText("es.present.ar", { infinitive: "hablar", person: "tú", ending: "as" }),
    "hablar is a regular -ar verb: tú takes -as.");
  assert.equal(reasonText("es.present.o-ue", { infinitive: "jugar", person: "yo", ending: "o" }),
    "jugar changes u → ue in every form except nosotros.");
  assert.equal(FAMILIES.length, 7);
});
```
- [ ] **Step 2: Run** `node --test tests/verb-classify.test.mjs` — expect `ERR_MODULE_NOT_FOUND` for `classify.ts`.
- [ ] **Step 3: Implement** the three files with the signatures and pinned rows above (`reasonText` templates: go-yo `"{inf} is a -go verb: the yo form ends in -go."`; regular `"{inf} is a regular -{ar|er|ir} verb: {PERSON_LABEL} takes -{ending}."`; stem change `"{inf} changes {e → ie | o → ue | u → ue | e → i} in every form except nosotros."`).
- [ ] **Step 4: Run** `node --test tests/verb-classify.test.mjs` — expect all pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/types.ts src/lib/verb-games/families.ts src/lib/verb-games/classify.ts tests/verb-classify.test.mjs && git commit -m "Verb Games: pattern types, families and form classifier"`

### Task 2: English-per-form conjugator

**Files:**
- Create: `src/lib/verb-games/english.ts`
- Test: `tests/verb-english.test.mjs`

**Interfaces:**
- Produces: `export function primaryGloss(gloss: string): string;` (first sense split on `,` `/` `;`, parentheticals removed, trimmed) and `export function englishForm(gloss: string, person: Person): string;` (pronoun `I | you | he/she | we | they` + head verb conjugated + rest of the phrase).
- Pinned irregulars: `be` → am / are / is / are / are; `have` → has, `do` → does, `go` → goes (third person). Third-person rule: ends `s, sh, ch, x, z, o` → `+es`; consonant + `y` → `ies`; else `+s`. A gloss without a leading `to ` is used whole.

- [ ] **Step 1: Write the failing test:**
```js
import { englishForm, primaryGloss } from "../src/lib/verb-games/english.ts";
test("conjugates head verbs and keeps phrase tails", () => {
  assert.equal(englishForm("to have", "yo"), "I have");
  assert.equal(englishForm("to have", "él_ella_usted"), "he/she has");
  assert.equal(englishForm("to do, to make", "él_ella_usted"), "he/she does");
  assert.equal(englishForm("to be worth", "yo"), "I am worth");
  assert.equal(englishForm("to be worth", "tú"), "you are worth");
  assert.equal(englishForm("to be worth", "él_ella_usted"), "he/she is worth");
  assert.equal(englishForm("to go up (to the next level)", "él_ella_usted"), "he/she goes up");
  assert.equal(englishForm("to watch, to observe", "él_ella_usted"), "he/she watches");
  assert.equal(englishForm("to carry", "él_ella_usted"), "he/she carries");
  assert.equal(englishForm("to play", "él_ella_usted"), "he/she plays");
  assert.equal(englishForm("to fail / to miss", "nosotros"), "we fail");
  assert.equal(englishForm("to look for", "ellos_ustedes"), "they look for");
  assert.equal(englishForm("to be (essence)", "yo"), "I am");
  assert.equal(primaryGloss("to kick, to punt"), "to kick");
});
```
- [ ] **Step 2: Run** `node --test tests/verb-english.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** `src/lib/verb-games/english.ts` per the signatures and pinned rules.
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/english.ts tests/verb-english.test.mjs && git commit -m "Verb Games: deterministic English per form"`

### Task 3: Pattern compiler and review report (pure)

**Files:**
- Create: `src/lib/verb-games/compile.ts`, `tests/helpers/verb-fixture.mjs`
- Test: `tests/verb-compile.test.mjs`

**Interfaces:**
- Consumes: `LessonVerb` from `src/lib/lesson-content-core.ts` (`{infinitive, native, forms: Record<string,string>, example: {target, native}, note?}`); `VerbProfile` from `src/components/dictionary/types.ts` (`phase1.presentYo|presentTu|presentEl`, `phase2.presentNosotros|presentEllos` as `MorphForm {full, stem, ending, irregular?, irregularNote?}`, `englishParallel`); Tasks 1–2.
- Produces:
```ts
export interface LessonFile { module: string; lessons: Record<string, { verbs?: LessonVerb[] }> }
export interface CompileInput { lessonFiles: LessonFile[]; profiles: Record<string, VerbProfile>;
  core: { infinitive: string; english: string }[]; crushLevels: CrushLevel[];
  signoff: { reportSha256: string; signedBy: string; signedAt: string } | null; }
export interface ReviewItem { infinitive: string;
  kind: "classified" | "excluded" | "profile-conflict" | "lesson-conflict" | "gloss-variants"; detail: string; }
export interface CompileOutput { data: PatternData; report: ReviewItem[]; reportMarkdown: string }
export function compilePatterns(input: CompileInput): CompileOutput;
// tests/helpers/verb-fixture.mjs
export function profileOf(forms: [string, string, string, string, string], extra?: { irregularType?: string; notes?: string[] }): object;
export function fixtureInput(overrides?: object): object;   // 16 verbs, module "roofing"
export function miniData(): PatternData;                       // compilePatterns(fixtureInput()).data
```
- Rules (body required where not determined by tests):
  - Key = lowercase NFC infinitive; persons read from NFC-normalized `forms` keys; missing person → `excluded` "missing <person>".
  - Infinitive ending `se`: forms with a leading clitic (`me|te|se|nos|os `) are never emitted. If the base infinitive has a profile or plain lesson entry, the `-se` entry only adds its module source to the base; otherwise `excluded` with detail `reflexive-only`.
  - Forms: profile forms when a profile exists (`status: "verified"`; any lesson disagreement → `profile-conflict`); else lesson forms, which must agree across modules (else `lesson-conflict` + `excluded`) and every person must have ≥1 family (else `excluded` "no family for <person>") → `status: "classified"` + a `classified` item.
  - `irregularType` and `irregularNote` are never read for families or text.
  - Gloss: most frequent lesson `native` (tie → lexicographically first), else core `english`, else `englishParallel`; >1 distinct lesson gloss → `gloss-variants`. Stored `english` = `primaryGloss`; per-form English = `englishForm`.
  - Sentence: from the first module (sorted) whose `example.target` contains exactly one whole-word token equal to one form → that form's `sentence = { target: <example with token replaced by "___">, native: example.native }`.
  - Sources: core `{kind:"core", rank}` (rank = index + 1 in `input.core`) first, then modules sorted.
  - `reportMarkdown` lists items grouped by kind, sorted by infinitive; never depends on `signoff`. `reportSha256` = sha256 hex of `reportMarkdown`. `signedOff = signoff?.reportSha256 === reportSha256`. Classified verbs enter `data.verbs` only when `signedOff`.
  - `data.verbs` sorted by infinitive (code-unit order). `dataHash` = first 16 hex of sha256 of `JSON.stringify({families, crushLevels, verbs})`.

- [ ] **Step 1: Write the failing test** `tests/verb-compile.test.mjs` (fixture from `verb-fixture.mjs`):
```js
test("verified verbs carry five forms with families and English", () => {
  const { data } = compilePatterns(fixtureInput());
  const tener = data.verbs.find((v) => v.infinitive === "tener");
  assert.equal(tener.status, "verified");
  assert.deepEqual(tener.forms.map((f) => f.full), ["tengo", "tienes", "tiene", "tenemos", "tienen"]);
  assert.deepEqual(tener.forms[0].families, ["es.present.go-yo"]);
  assert.equal(tener.forms[2].english, "he/she has");
  assert.match(data.dataHash, /^[0-9a-f]{16}$/);
});
test("reflexive forms never emit clitics", () => {                 // Review Focus 3
  const only = compilePatterns(fixtureInput({ extraLessons: [{ infinitive: "cruzarse", native: "to cross over",
    forms: { yo: "me cruzo", tú: "te cruzas", él_ella_usted: "se cruza", nosotros: "nos cruzamos", ellos_ustedes: "se cruzan" },
    example: { target: "Me cruzo.", native: "I cross." } }] }));
  assert.ok(only.report.some((r) => r.infinitive === "cruzarse" && r.kind === "excluded" && r.detail === "reflexive-only"));
  assert.ok(only.data.verbs.every((v) => v.forms.every((f) => !/\s/.test(f.full) && !/\s/.test(f.stem))));
});
test("profile labels and notes never drive families or reasons", () => {   // Review Focus 4
  const { data } = compilePatterns(fixtureInput({ profileExtras: {
    poder: { irregularType: "stem-change", notes: ["E→UE stem change"] },
    conocer: { irregularType: "go-verb", notes: ["yo-form adds -zc- before o"] } } }));
  const poder = data.verbs.find((v) => v.infinitive === "poder");
  assert.deepEqual(poder.forms[1].families, ["es.present.o-ue"]);
  assert.deepEqual(data.verbs.find((v) => v.infinitive === "conocer").forms[0].families, []);
  assert.ok(!JSON.stringify(data).includes("E→UE"));
});
test("classified verbs ship only after sign-off of this exact report", () => {
  const input = fixtureInput({ dropProfiles: ["pensar"] });
  const unsigned = compilePatterns(input);
  assert.ok(unsigned.report.some((r) => r.infinitive === "pensar" && r.kind === "classified"));
  assert.equal(unsigned.data.verbs.some((v) => v.infinitive === "pensar"), false);
  const signed = compilePatterns({ ...input, signoff: { reportSha256: unsigned.data.reportSha256, signedBy: "Reviewer", signedAt: "2026-10-21" } });
  assert.equal(signed.data.signedOff, true);
  assert.equal(signed.data.verbs.find((v) => v.infinitive === "pensar").status, "classified");
});
test("lesson sentence becomes a frame with one blank", () => {
  const { data } = compilePatterns(fixtureInput());
  assert.deepEqual(data.verbs.find((v) => v.infinitive === "subir").forms[2].sentence,
    { target: "El techador ___ la escalera.", native: "The roofer climbs the ladder." });
});
```
- [ ] **Step 2: Run** `node --test tests/verb-compile.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** `tests/helpers/verb-fixture.mjs` (16 verbs, glosses "to have", "to come", "to leave", … so English is predictable: tener, venir, salir, poner, decir, hablar, comer, vivir, subir, pensar, sentar, sentir, poder, jugar, pedir, conocer — profiles for all, lesson file `roofing` for subir/tener/venir with the `subir` example above, core list `[tener, venir, salir, poner, decir, hablar, comer, vivir, pensar, sentar, sentir, poder, jugar, pedir, conocer]`) and `src/lib/verb-games/compile.ts` per the rules.
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/compile.ts tests/helpers/verb-fixture.mjs tests/verb-compile.test.mjs && git commit -m "Verb Games: pattern compiler with review report and sign-off gate"`

### Task 4: Build script, committed Spanish data and dataset tests

**Files:**
- Create: `scripts/build-verb-patterns.mts`, `src/data/verb-patterns/crush-levels.json`, `src/data/verb-patterns/es.json` (generated), `docs/verb-patterns/es-review-report.md` (generated), `docs/verb-patterns/es-review-signoff.json`, `docs/verb-games.md`
- Test: `tests/verb-patterns.test.mjs`

**Interfaces:**
- Consumes: `compilePatterns`; `verbProfiles` (`src/components/dictionary/verbProfiles.ts`, 390 entries); `KNOWN_VERBS` (`src/data/known-verb-list.ts`, 100 Spanish rows → `core`); `public/lesson-content/es/*.json` (63 files, `module` field = moduleId).
- Produces: `node scripts/build-verb-patterns.mts` writes both outputs (main runs only under `import.meta.main`, so the test can import it); `node scripts/build-verb-patterns.mts --check` exits 1 with `verb patterns are stale` when a fresh compile differs. Exported `export async function readCompileInput(root: string): Promise<CompileInput>` for the test.
- `crush-levels.json` pinned:
```json
[{"level":1,"label":"Make 5 yo forms","persons":["yo"],"families":"picked","goalCount":5,"moveBudget":20},
 {"level":2,"label":"Make 6 forms: yo and tú","persons":["yo","tú"],"families":"picked","goalCount":6,"moveBudget":20},
 {"level":3,"label":"Crossover: tengo and tienes","persons":["yo","tú","él_ella_usted","ellos_ustedes"],"families":["es.present.go-yo","es.present.e-ie"],"goalCount":6,"moveBudget":18},
 {"level":4,"label":"Make 8 forms, every person","persons":"family","families":"picked","goalCount":8,"moveBudget":16}]
```
- `es-review-signoff.json` starts as `null`.

- [ ] **Step 1: Write the failing test** `tests/verb-patterns.test.mjs`:
```js
const data = JSON.parse(readFileSync("src/data/verb-patterns/es.json", "utf8"));
test("committed es.json equals a fresh compile", async () => {
  const { readCompileInput } = await import("../scripts/build-verb-patterns.mts");
  const fresh = compilePatterns(await readCompileInput(process.cwd()));
  assert.deepEqual(fresh.data, data);
  assert.equal(fresh.reportMarkdown, readFileSync("docs/verb-patterns/es-review-report.md", "utf8"));
});
test("every verb has all five persons and every family rule holds", () => {
  for (const v of data.verbs) {
    assert.deepEqual(v.forms.map((f) => f.person), PERSONS);
    for (const f of v.forms) assert.deepEqual(f.families, formFamilies(v.infinitive, f.person, f.full));
    for (const f of v.forms) if (f.families.length) assert.equal(f.stem + f.ending, f.full);
  }
});
test("72 core verbs are verified by a dictionary profile", () => {
  const core = data.verbs.filter((v) => v.sources.some((s) => s.kind === "core") && v.status === "verified");
  assert.equal(core.length, 72);
});
test("unsigned data contains no classified verbs", () => {
  if (!data.signedOff) assert.ok(data.verbs.every((v) => v.status === "verified"));
});
```
- [ ] **Step 2: Run** `node --test tests/verb-patterns.test.mjs` — expect ENOENT for `es.json`.
- [ ] **Step 3: Implement** the script and level file; run `node scripts/build-verb-patterns.mts`; write `docs/verb-games.md` sections "Verb review sign-off" (reviewer reads `docs/verb-patterns/es-review-report.md`, writes `{reportSha256, signedBy, signedAt}` into `es-review-signoff.json`, reruns the script) and "Regenerating data".
- [ ] **Step 4: Run** `node --test tests/verb-patterns.test.mjs && node scripts/build-verb-patterns.mts --check` — expect pass and exit 0. Check `ls -l src/data/verb-patterns/es.json` is under 600 KB.
- [ ] **Step 5: Commit** `git add scripts/build-verb-patterns.mts src/data/verb-patterns docs/verb-patterns docs/verb-games.md tests/verb-patterns.test.mjs && git commit -m "Verb Games: compiled Spanish present data and review report"`

### Task 5: Seeded RNG, verb pool and frames

**Files:**
- Create: `src/lib/verb-games/rng.ts`, `src/lib/verb-games/pool.ts`, `src/lib/verb-games/frames.ts`
- Test: `tests/verb-frames.test.mjs`

**Interfaces:**
- Produces:
```ts
// rng.ts
export type Rng = () => number;
export function createRng(seed: number): Rng;               // mulberry32
export function pickIndex(rng: Rng, n: number): number;
export function shuffle<T>(rng: Rng, items: readonly T[]): T[];
// pool.ts
export type SourceFilter = { kind: "core" } | { kind: "module"; moduleId: string } | { kind: "both"; moduleId: string };
export interface FrameSlot { infinitive: string; person: Person; familyId: FamilyId }
export function poolVerbs(data: PatternData, source: SourceFilter): VerbEntry[];
export function frameSlots(data: PatternData, families: FamilyId[], persons: Person[] | "family", source: SourceFilter): FrameSlot[];
// frames.ts
export interface Frame { index: number; infinitive: string; person: Person; familyId: FamilyId; answer: string;
  english: string; prompt: string; sentence: { target: string; native: string } | null; }
export function buildFrame(data: PatternData, slot: FrameSlot, index: number, useSentence: boolean): Frame;
export function nextSlot(rng: Rng, slots: readonly FrameSlot[], previous: FrameSlot | null): FrameSlot;
```
- `prompt` = `${PERSON_LABEL[person]} ___`; with `useSentence` and a sentence present, `prompt = sentence.target`, `english = sentence.native`. `nextSlot` never returns the same infinitive+person as `previous` when another slot exists.

- [ ] **Step 1: Write the failing test** (uses `miniData()`):
```js
test("rng is reproducible", () => {
  const r = createRng(1);
  assert.deepEqual([r(), r(), r()], [0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
});
test("slots respect family, persons and source", () => {
  const data = miniData();
  const go = frameSlots(data, ["es.present.go-yo"], "family", { kind: "core" });
  assert.ok(go.length > 0 && go.every((s) => s.person === "yo"));
  assert.deepEqual(frameSlots(data, ["es.present.go-yo"], "family", { kind: "module", moduleId: "roofing" })
    .map((s) => s.infinitive).sort(), ["tener", "venir"]);
  assert.deepEqual(frameSlots(data, ["es.present.go-yo"], ["tú"], { kind: "core" }), []);
});
test("frames show person and meaning, never repeat back-to-back", () => {
  const data = miniData();
  const f = buildFrame(data, { infinitive: "venir", person: "yo", familyId: "es.present.go-yo" }, 0, false);
  assert.deepEqual([f.prompt, f.answer, f.english], ["yo ___", "vengo", "I come"]);
  const slots = frameSlots(data, ["es.present.go-yo"], "family", { kind: "core" });
  const rng = createRng(3); let prev = null;
  for (let i = 0; i < 50; i++) { const s = nextSlot(rng, slots, prev); assert.notDeepEqual(s, prev); prev = s; }
});
```
- [ ] **Step 2: Run** `node --test tests/verb-frames.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** the three files.
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/rng.ts src/lib/verb-games/pool.ts src/lib/verb-games/frames.ts tests/verb-frames.test.mjs && git commit -m "Verb Games: seeded RNG, verb pool and frames"`

### Task 6: Distractor generator

**Files:**
- Create: `src/lib/verb-games/distractors.ts`
- Test: `tests/verb-distractors.test.mjs`

**Interfaces:**
- Produces:
```ts
export const norm: (s: string) => string;                     // NFC + toLowerCase
export function isAnyPresentForm(data: PatternData, candidate: string): boolean;
export function forFrame(frame: Frame, data: PatternData, pool: readonly VerbEntry[], n: number, rng: Rng): string[];
```
- Candidate order before rejection: regularized `regularPresent(inf)[person]` (always first when the answer's families exclude the infinitive's regular family); misplaced stem change (swap `ie`→`ei`, `ue`→`eu` in the answer); up to 2 other persons of the same verb; up to 2 same-family same-person forms of other pool verbs; near-neighbor single-letter substitutions from `{g:"d", c:"s", n:"m", r:"l", t:"d", d:"t"}` applied left to right until enough.
- Rejection: drop any candidate whose `norm` equals `norm(frame.answer)` or `norm` of the target verb's form for the target person, or equals an earlier candidate. Returns `n` strings (regularized kept, rest shuffled by `rng`).

- [ ] **Step 1: Write the failing test:**
```js
test("homograph from another verb is never a distractor", () => {      // Review Focus 2
  const data = miniData(); const pool = poolVerbs(data, { kind: "core" });
  const frame = buildFrame(data, { infinitive: "sentar", person: "yo", familyId: "es.present.e-ie" }, 0, false);
  for (let seed = 0; seed < 200; seed++) assert.ok(!forFrame(frame, data, pool, 5, createRng(seed)).includes("siento"));
});
test("irregular targets always include the regularized form", () => {
  const data = miniData(); const pool = poolVerbs(data, { kind: "core" });
  const frame = buildFrame(data, { infinitive: "salir", person: "yo", familyId: "es.present.go-yo" }, 0, false);
  assert.ok(forFrame(frame, data, pool, 5, createRng(9)).includes("salo"));
});
test("over every frame in the dataset: five distinct candidates, none valid for the target", () => {
  const data = JSON.parse(readFileSync("src/data/verb-patterns/es.json", "utf8"));
  const pool = poolVerbs(data, { kind: "core" });
  for (const v of data.verbs) for (const f of v.forms) for (const familyId of f.families) {
    const frame = buildFrame(data, { infinitive: v.infinitive, person: f.person, familyId }, 0, false);
    const out = forFrame(frame, data, pool, 5, createRng(1));
    assert.equal(new Set(out.map(norm)).size, 5, `${v.infinitive} ${f.person}`);
    assert.ok(out.every((c) => norm(c) !== norm(f.full)));
  }
});
```
- [ ] **Step 2: Run** `node --test tests/verb-distractors.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** `src/lib/verb-games/distractors.ts`.
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/distractors.ts tests/verb-distractors.test.mjs && git commit -m "Verb Games: distractor generator with dataset-wide rejection test"`

### Task 7: Bubble Pop round engine

**Files:**
- Create: `src/lib/verb-games/rules.ts`, `src/lib/verb-games/bubble.ts`
- Modify: `src/lib/verb-games/types.ts` (append round types)
- Test: `tests/verb-bubble.test.mjs`

**Interfaces:**
- Produces:
```ts
// types.ts (append)
export type GameId = "bubble" | "crush";
export interface RoundConfig { game: GameId; family: FamilyId | "mix"; level: 1 | 2 | 3 | 4 | null;
  source: SourceFilter; seed: number; listMode: boolean; reducedMotion: boolean; }
export type RoundEvent = { t: number; kind: "pick"; frame: number; piece: number } | { t: number; kind: "swap"; a: number; b: number };
export interface RoundLog { v: 1; clientRoundId: string; dataHash: string; config: RoundConfig; endedAt: string; events: RoundEvent[] }
export interface Completion { t: number; infinitive: string; person: Person; familyId: FamilyId; form: string; english: string; points: number }
export interface Miss { t: number; infinitive: string; person: Person; familyId: FamilyId | null; attempted: string | null; correct: string; english: string; reason: string }
export interface RoundResult { score: number; moves: number; picks: number; correct: number; bestStreak: number;
  durationMs: number; completions: Completion[]; misses: Miss[]; won: boolean; }
export type Outcome = { kind: "complete"; completion: Completion } | { kind: "miss"; miss: Miss } | { kind: "frame"; index: number } | { kind: "invalid" } | { kind: "end" };
// rules.ts
export const ROUND_MS: Record<GameId, number>;                 // { bubble: 60_000, crush: 90_000 }
export const REASON_MS = 1200;
export function streakMultiplier(streak: number): number;     // min(8, streak)
export function bubbleLifetimeMs(t: number): number;          // max(3500, 6000 - 500 * floor(t / 10000))
export function bubbleCount(t: number): number;               // t < 20000 ? 4 : t < 40000 ? 5 : 6
export const SENTENCE_AFTER_MS = 30_000;
export function roundFamilies(config: RoundConfig, data: PatternData): FamilyId[];
export function scopeKey(config: RoundConfig): string;        // bubble "go-yo" | "mix"; crush "L1:go-yo"; level 3 "L3:crossover"
// bubble.ts
export interface BubblePiece { id: number; label: string; correct: boolean }
export interface BubbleView { frame: Frame; pieces: BubblePiece[]; removed: number[]; shownAt: number; deadline: number;
  score: number; streak: number; t: number; ended: boolean; lastReason: string | null; }
export interface BubbleRound { view(): BubbleView; advance(t: number): Outcome[]; pick(t: number, frame: number, piece: number): Outcome[];
  end(t: number): RoundResult; events(): RoundEvent[]; }
export function createBubbleRound(data: PatternData, config: RoundConfig): BubbleRound;
```
- Rules: frame i shows at `shownAt`, `deadline = shownAt + bubbleLifetimeMs(shownAt)`; pieces = answer + `forFrame(..., bubbleCount(shownAt) - 1, rng)` shuffled; sentences used when `shownAt ≥ SENTENCE_AFTER_MS`. Correct pick → `points = 100 * streakMultiplier(streak) + Math.round(20 * (deadline - t) / lifetime)`, next frame at `t`. Wrong pick → miss (reason `"{attempted} ✗ → {answer} · {reasonText}"`), piece removed, streak 0, frame stays. `advance(t)` past the deadline → miss with `attempted: null` (escape), next frame at the deadline. Picks on removed/out-of-range pieces or a stale frame index → `[{kind:"invalid"}]` and not logged. Round ends at `ROUND_MS.bubble`.

- [ ] **Step 1: Write the failing test:**
```js
const cfg = { game: "bubble", family: "es.present.go-yo", level: null, source: { kind: "core" }, seed: 11, listMode: false, reducedMotion: false };
test("same seed, same frames and pieces", () => {
  assert.deepEqual(createBubbleRound(miniData(), cfg).view(), createBubbleRound(miniData(), cfg).view());
});
test("correct pick scores with streak and speed bonus", () => {
  const r = createBubbleRound(miniData(), cfg); const v = r.view();
  const right = v.pieces.find((p) => p.correct).id;
  const [done] = r.pick(1000, 0, right);
  assert.equal(done.completion.points, 100 + Math.round(20 * 5000 / 6000));
  assert.equal(r.view().frame.index, 1);
});
test("a log that omits escapes cannot avoid the miss", () => {
  const r = createBubbleRound(miniData(), cfg);
  const out = r.advance(9000);
  assert.equal(out[0].kind, "miss"); assert.equal(out[0].miss.attempted, null);
  assert.equal(r.view().streak, 0); assert.equal(r.view().shownAt, 6000);
});
test("wrong pick shows the reason and keeps the frame", () => {
  const r = createBubbleRound(miniData(), cfg); const v = r.view();
  const wrong = v.pieces.find((p) => !p.correct);
  const [m] = r.pick(500, 0, wrong.id);
  assert.match(m.miss.reason, / ✗ → .* · .* is a -go verb: the yo form ends in -go\.$/);
  assert.deepEqual(r.pick(600, 0, wrong.id), [{ kind: "invalid" }]);
});
test("scope keys", () => {
  assert.equal(scopeKey(cfg), "go-yo");
  assert.equal(scopeKey({ ...cfg, game: "crush", level: 3 }), "L3:crossover");
  assert.equal(scopeKey({ ...cfg, game: "crush", level: 1, family: "mix" }), "L1:mix");
});
```
- [ ] **Step 2: Run** `node --test tests/verb-bubble.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** `rules.ts`, `bubble.ts`, and the type additions.
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/types.ts src/lib/verb-games/rules.ts src/lib/verb-games/bubble.ts tests/verb-bubble.test.mjs && git commit -m "Verb Games: Bubble Pop round engine"`

### Task 8: Verb Crush round engine

**Files:**
- Create: `src/lib/verb-games/crush.ts`
- Modify: `src/lib/verb-games/rules.ts` (add `levelAvailable`, `personForEnding`)
- Test: `tests/verb-crush.test.mjs`

**Interfaces:**
- Produces:
```ts
// rules.ts (append)
export function levelAvailable(data: PatternData, level: CrushLevel, family: FamilyId | "mix", source: SourceFilter): boolean;
// true iff (persons === "family" or every listed person is in some round family's appliesTo) and ≥ 3 distinct goal forms
export function personForEnding(ending: string, infinitive: string): Person; // o→yo, as/es→tú, a/e→él, amos/emos/imos→nosotros, an/en→ellos, go→yo
// crush.ts
export const CRUSH_SIZE = 5;
export interface CrushTile { id: number; kind: "stem" | "ending"; label: string; infinitive: string }
export interface CrushView { cells: CrushTile[]; goalCount: number; made: number; movesLeft: number; score: number;
  streak: number; t: number; ended: boolean; won: boolean; lastReason: string | null; }
export interface CrushRound { view(): CrushView; swap(t: number, a: number, b: number): Outcome[]; advance(t: number): Outcome[];
  end(t: number): RoundResult; findPopSwap(): [number, number] | null; events(): RoundEvent[]; }
export function adjacent(a: number, b: number): boolean;      // orthogonal neighbors on the 5×5 grid
export function createCrushRound(data: PatternData, config: RoundConfig, options?: { layout?: CrushTile[] }): CrushRound;
```
- Rules: goal set = forms of round verbs with families in `roundFamilies` and persons in the level row (`"family"` = each family's `appliesTo`). A pair is a stem cell immediately left of an ending cell in the same row. Generation (seeded): no goal pair at start and `findPopSwap()` non-null; retry with derived seeds, and if 50 attempts fail, place a goal stem at column 0, a filler at column 1 and its ending at column 2 of row 0. After a swap: pop every goal pair (both cells refill from the seeded deck), then cascade scans pop with `points = 50 * streakMultiplier(streak) * chainStep` (`chainStep` 1, 2, …); if no pop and a moved cell sits in a pair whose concatenation `!isAnyPresentForm(data, …)` → trap: swap reverted, no move spent, miss with `correct = verb.forms[personForEnding(...)].full` and reason; otherwise neutral (move spent). Non-adjacent swap → `invalid`. Ends on `made ≥ goalCount` (won), `movesLeft = 0`, or `t ≥ ROUND_MS.crush`. If refills leave no pop swap, the board regenerates (score unchanged).

- [ ] **Step 1: Write the failing test** (layouts built with a local `tile(kind,label,inf)` helper):
```js
const cfg = { game: "crush", family: "es.present.go-yo", level: 1, source: { kind: "core" }, seed: 7, listMode: false, reducedMotion: false };
test("deterministic board with a guaranteed first pop and no free pops", () => {
  const a = createCrushRound(miniData(), cfg), b = createCrushRound(miniData(), cfg);
  assert.deepEqual(a.view().cells, b.view().cells);
  const [x, y] = a.findPopSwap(); const out = a.swap(500, x, y);
  assert.equal(out.find((o) => o.kind === "complete").completion.points, 50);
  assert.equal(a.view().movesLeft, 19);
});
// layoutWith(pairs) fills every other cell with ending tiles labelled "amos" (endings never pair with endings)
test("trap costs the streak, not a move, and is reverted", () => {
  const r = createCrushRound(miniData(), cfg, { layout: layoutWith([[0, tile("stem", "ten", "tener")], [2, tile("ending", "o", "tener")]]) });
  const [m] = r.swap(400, 1, 2);
  assert.equal(m.miss.reason, "teno ✗ → tengo · tener is a -go verb: the yo form ends in -go.");
  assert.equal(r.view().movesLeft, 20); assert.equal(r.view().cells[2].label, "o");
});
test("valid non-goal pair is neutral, never a miss", () => {            // Review Focus 2
  const r = createCrushRound(miniData(), cfg, { layout: layoutWith([[0, tile("stem", "com", "comer")], [2, tile("ending", "o", "comer")]]) });
  assert.deepEqual(r.swap(400, 1, 2).filter((o) => o.kind === "miss"), []);
  assert.equal(r.view().movesLeft, 19);
});
test("levels: go-yo has levels 1, 3 and 4 but not 2", () => {
  const d = miniData();
  assert.deepEqual(d.crushLevels.map((l) => levelAvailable(d, l, "es.present.go-yo", { kind: "core" })), [true, false, true, true]);
});
test("non-adjacent swap is invalid", () => {
  assert.deepEqual(createCrushRound(miniData(), cfg).swap(300, 0, 2), [{ kind: "invalid" }]);
});
```
- [ ] **Step 2: Run** `node --test tests/verb-crush.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** `crush.ts` and the `rules.ts` additions.
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/crush.ts src/lib/verb-games/rules.ts tests/verb-crush.test.mjs && git commit -m "Verb Crush round engine"`

### Task 9: Round replay scoring and log validation

**Files:**
- Create: `src/lib/verb-games/scoring.ts`
- Modify: `tests/helpers/verb-fixture.mjs` (add `base(game)` configs and `playHonest(data, config, { gapMs = 900 } = {})`, which drives the engine with correct picks or `findPopSwap` swaps and returns `{ log, result }`)
- Test: `tests/verb-scoring.test.mjs`

**Interfaces:**
- Produces:
```ts
export type Verdict =
  | { ok: true; result: RoundResult; ranked: boolean; softReasons: string[] }
  | { ok: false; stale: true }
  | { ok: false; hard: true; reason: "out-of-order" | "after-end" | "invalid-event" | "too-many-events" | "unknown-scope" };
export function scoreRound(data: PatternData, log: RoundLog): Verdict;
```
- Order: `log.dataHash !== data.dataHash` → stale (nothing replayed). Unknown family/level, or Crush level not `levelAvailable` → `unknown-scope`. `events.length > ROUND_MS[game] / 100` → `too-many-events`. `t` decreasing → `out-of-order`; `t > ROUND_MS[game] + 1000` → `after-end`; any `invalid` outcome → `invalid-event`. Soft: `listMode` → `"list-mode"`; three or more gaps under 250 ms between consecutive events → `"fast-picks"`. `ranked = softReasons.length === 0`.

- [ ] **Step 1: Write the failing test** (helper `playHonest(data, cfg)` drives the engine with correct picks / `findPopSwap` every 900 ms and returns the log and the engine's own result):
```js
test("honest logs replay to the client's own result across 50 seeds", () => {
  for (const game of ["bubble", "crush"]) for (let seed = 0; seed < 50; seed++) {
    const { log, result } = playHonest(miniData(), { ...base(game), seed });
    const v = scoreRound(miniData(), log);
    assert.equal(v.ok, true); assert.deepEqual(v.result, result); assert.equal(v.ranked, true);
  }
});
test("stale data is reported, never judged", () => {                 // Review Focus 1
  const { log } = playHonest(miniData(), base("bubble"));
  assert.deepEqual(scoreRound(miniData(), { ...log, dataHash: "0000000000000000" }), { ok: false, stale: true });
});
test("constructed cheat logs are rejected", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  const e = log.events;
  assert.equal(scoreRound(miniData(), { ...log, events: [e[1], e[0], ...e.slice(2)] }).reason, "out-of-order");
  assert.equal(scoreRound(miniData(), { ...log, events: [...e, { t: 99_000, kind: "pick", frame: 0, piece: 0 }] }).reason, "after-end");
  assert.equal(scoreRound(miniData(), { ...log, events: [{ ...e[0], piece: 42 }] }).reason, "invalid-event");
  assert.equal(scoreRound(miniData(), { ...log, config: { ...log.config, family: "es.present.zco" } }).reason, "unknown-scope");
});
test("list mode and machine-speed picks score but are not ranked", () => {
  const { log } = playHonest(miniData(), { ...base("bubble"), listMode: true });
  assert.deepEqual(scoreRound(miniData(), log).softReasons, ["list-mode"]);
  const fast = playHonest(miniData(), base("bubble"), { gapMs: 120 });
  assert.equal(scoreRound(miniData(), fast.log).ranked, false);
});
```
- [ ] **Step 2: Run** `node --test tests/verb-scoring.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** `scoring.ts` (replay = create the round from `log.config`, call `advance(t)` then the event, then `end(min(lastT, ROUND_MS))` or the win time).
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/scoring.ts tests/verb-scoring.test.mjs && git commit -m "Verb Games: replay scoring and log validation"`

### Task 10: Verb Games device state

**Files:**
- Create: `src/lib/verb-games/device.ts`, `src/hooks/use-verb-device.ts`
- Test: `tests/verb-device.test.mjs`

**Interfaces:**
- Consumes: `useLearnerDeviceStore(kind)` from `src/hooks/use-learner-device-store.ts` (returns `{read(): unknown, write(data): boolean}`).
- Produces:
```ts
export interface VerbDeviceState { v: 1;
  mastery: Record<string, { picks: number; correct: number }>;      // key "familyId|infinitive"
  bests: Record<string, { score: number; moves: number; at: string }>; // key "game|scopeKey"
  ranks: Record<string, { period: string; rank: number | null }>;
  queue: RoundLog[]; settings: { source: "module" | "core" | "both"; listMode: boolean };
  unitSteps: Partial<Record<FamilyId, ("see" | "hear" | "recall")[]>>; }
export const EMPTY_VERB_DEVICE: VerbDeviceState;
export const MASTERY = { minPicks: 30, accuracy: 0.85 } as const;
export const MAX_QUEUE = 50;
export function readVerbDevice(raw: unknown): VerbDeviceState;
export function recordRound(s: VerbDeviceState, log: RoundLog, result: RoundResult, opts: { queue: boolean }): VerbDeviceState;
export function recordPicks(s: VerbDeviceState, picks: { familyId: FamilyId; infinitive: string; correct: boolean }[]): VerbDeviceState;
export function familyMastery(s: VerbDeviceState, familyId: FamilyId, infinitives: readonly string[]): { picks: number; correct: number; mastered: boolean; verbsMastered: number };
export function suggestedFamily(s: VerbDeviceState, data: PatternData): FamilyId;   // first by tier then FAMILIES order not mastered
export function markStep(s: VerbDeviceState, familyId: FamilyId, step: "see" | "hear" | "recall"): VerbDeviceState;
// use-verb-device.ts
export function useVerbDevice(): { state: VerbDeviceState; update(fn: (s: VerbDeviceState) => VerbDeviceState): void };  // kind "verb-games"
```
- Best replaces only on higher score, or equal score with fewer moves. Queue keeps the newest `MAX_QUEUE`.

- [ ] **Step 1: Write the failing test:**
```js
test("sanitizes foreign or corrupt device data", () => {
  assert.deepEqual(readVerbDevice({ v: 2, queue: "x" }), EMPTY_VERB_DEVICE);
  assert.deepEqual(readVerbDevice(null), EMPTY_VERB_DEVICE);
});
test("mastery needs 30 picks at 85%", () => {
  let s = recordPicks(EMPTY_VERB_DEVICE, Array.from({ length: 29 }, () => ({ familyId: "es.present.go-yo", infinitive: "tener", correct: true })));
  assert.equal(familyMastery(s, "es.present.go-yo", ["tener"]).mastered, false);
  s = recordPicks(s, [{ familyId: "es.present.go-yo", infinitive: "tener", correct: true }]);
  assert.deepEqual(familyMastery(s, "es.present.go-yo", ["tener"]), { picks: 30, correct: 30, mastered: true, verbsMastered: 1 });
});
// sampleLog: crush, level 1, family es.present.go-yo (key "crush|L1:go-yo"); sampleResult: score 100, moves 5, no misses
test("bests keep the higher score, ties go to fewer moves; queue caps at 50", () => {
  const log = (id) => ({ ...sampleLog, clientRoundId: id });
  let s = recordRound(EMPTY_VERB_DEVICE, log("a"), { ...sampleResult, score: 300, moves: 12 }, { queue: true });
  s = recordRound(s, log("b"), { ...sampleResult, score: 300, moves: 10 }, { queue: true });
  assert.deepEqual(s.bests["crush|L1:go-yo"].moves, 10);
  for (let i = 0; i < 60; i++) s = recordRound(s, log(`q${i}`), sampleResult, { queue: true });
  assert.equal(s.queue.length, 50); assert.equal(s.queue[49].clientRoundId, "q59");
});
```
- [ ] **Step 2: Run** `node --test tests/verb-device.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** `device.ts` and the hook (hydrate once from `read()`, write on every `update`).
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/device.ts src/hooks/use-verb-device.ts tests/verb-device.test.mjs && git commit -m "Verb Games: device state for mastery, bests and queue"`

### Task 11: Verbs sub-route and nav param cleanup

**Files:**
- Create: `src/lib/verb-games/verb-route.ts`
- Modify: `src/lib/app-navigation.ts:62-70` (clear verb params when the tab is not `games`)
- Test: `tests/verb-route.test.mjs`, `tests/app-navigation.test.mjs` (add one case)

**Interfaces:**
- Produces:
```ts
export type VerbScreen =
  | { screen: "home" }
  | { screen: "pick"; game: GameId; family: FamilyId | "mix" | null }
  | { screen: "play"; game: GameId; family: FamilyId | "mix"; level: 1 | 2 | 3 | 4 | null }
  | { screen: "board"; game: GameId; scope: string | null }
  | { screen: "unit"; family: FamilyId };
export const VERB_ROUTE_PARAMS: readonly ["verbs", "vgame", "vfamily", "vlevel", "vscope"];
export function parseVerbRoute(search: string): VerbScreen;           // anything invalid → { screen: "home" }
export function verbRouteSearch(search: string, screen: VerbScreen): string;  // keeps other params, returns "?…"
```

- [ ] **Step 1: Write the failing tests:**
```js
test("round-trips every screen and rejects junk", () => {
  const s = "?module=core&target=Spanish&native=English&tab=games";
  for (const screen of [{ screen: "home" }, { screen: "pick", game: "crush", family: "es.present.e-ie" },
    { screen: "play", game: "bubble", family: "mix", level: null }, { screen: "board", game: "crush", scope: "L1:go-yo" },
    { screen: "unit", family: "es.present.go-yo" }])
    assert.deepEqual(parseVerbRoute(verbRouteSearch(s, screen)), screen);
  assert.deepEqual(parseVerbRoute("?verbs=play&vgame=chess"), { screen: "home" });
  assert.match(verbRouteSearch(s, { screen: "home" }), /tab=games/);
});
// tests/app-navigation.test.mjs
test("leaving Games clears the Verbs sub-route", () => {
  const next = appNavigationLocation("/?module=core&target=Spanish&native=English&tab=games&verbs=unit&vfamily=es.present.go-yo", { ...context, tab: "reader" });
  assert.equal(params(next).get("verbs"), null); assert.equal(params(next).get("vfamily"), null);
});
```
- [ ] **Step 2: Run** `node --test tests/verb-route.test.mjs tests/app-navigation.test.mjs` — expect module-not-found / the new assertion failing.
- [ ] **Step 3: Implement** `verb-route.ts`; in `appNavigationLocation` add `if (context.tab !== "games") for (const key of VERB_ROUTE_PARAMS) params.delete(key);` (import `./verb-games/verb-route.ts`).
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/verb-route.ts src/lib/app-navigation.ts tests/verb-route.test.mjs tests/app-navigation.test.mjs && git commit -m "Verb Games: sub-route under the Games tab"`

### Task 12: Shared game UI primitives

**Files:**
- Create: `src/hooks/use-reduced-motion.ts`, `src/hooks/use-round-clock.ts`, `src/components/games/verbs/PieceTile.tsx`, `GameHud.tsx`, `ReasonBand.tsx`, `LiveRegion.tsx`, `Legend.tsx`, `CompletionFlash.tsx`, `FrameChoices.tsx`
- Test: `tests/verb-ui.test.mjs`

**Interfaces:**
- Produces:
```ts
export function useReducedMotion(): boolean;                    // matchMedia("(prefers-reduced-motion: reduce)"), live
export function useRoundClock(active: boolean, onTick: (t: number) => void): { t: number };  // rAF, paused while document.hidden
export function PieceTile(p: { kind: "stem" | "ending" | "whole" | "done"; label: string; selected?: boolean; dimmed?: boolean; onClick?: () => void; testId?: string }): JSX.Element;
export function GameHud(p: { eyebrow: string; score: number; streak: number; msLeft: number; movesLeft?: number }): JSX.Element;
export function ReasonBand(p: { text: string | null }): JSX.Element;    // fixed height, always rendered
export function LiveRegion(p: { message: string }): JSX.Element;         // aria-live="polite"
export function Legend(): JSX.Element;
export function CompletionFlash(p: { completion: Completion | null; onSaveCard: (c: Completion) => void }): JSX.Element;
export function FrameChoices(p: { prompt: string; english: string; infinitive: string; options: { id: number; label: string }[]; disabled: number[]; onPick: (id: number) => void }): JSX.Element;
```
- PieceTile labels/aria: stem renders `ten-` with `aria-label="stem ten"`, rounded rectangle; ending renders `-go`, `aria-label="ending go"`, left-chevron `clip-path`; whole renders pill, `aria-label="form vengo"`. HUD text `SCORE 2,060 · STREAK ×6 · 0:39` (mono). Legend text `stem · ending / letters · whole form`. CompletionFlash text `vengo · I come`; long-press 500 ms or `contextmenu` calls `onSaveCard`. FrameChoices numbers options 1–6 and handles keys `1`–`6`.

- [ ] **Step 1: Write the failing test** (`loadModule(..., { external: ["react-dom/server"] })`, `renderToStaticMarkup`):
```js
test("pieces carry shape and label, not color alone", () => {
  assert.match(html(PieceTile, { kind: "stem", label: "ten" }), /aria-label="stem ten"[^>]*>.*ten-/);
  assert.match(html(PieceTile, { kind: "ending", label: "go" }), /aria-label="ending go"[^>]*data-shape="chevron"/);
  assert.match(html(PieceTile, { kind: "whole", label: "vengo" }), /data-shape="pill"/);
});
test("HUD, reason band, legend and choices", () => {
  assert.match(html(GameHud, { eyebrow: "GAME · BUBBLE POP", score: 2060, streak: 6, msLeft: 39000 }), /SCORE 2,060.*STREAK ×6.*0:39/);
  assert.match(html(ReasonBand, { text: null }), /data-testid="reason-band"/);
  assert.match(html(Legend, {}), /stem · ending \/ letters · whole form/);
  assert.match(html(FrameChoices, { prompt: "yo ___", english: "I come", infinitive: "venir", options: [{ id: 0, label: "vengo" }], disabled: [], onPick() {} }), /1.*vengo/);
});
```
- [ ] **Step 2: Run** `node --test tests/verb-ui.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** the hooks and components with theme tokens and the piece colors from Global Constraints; motion classes only when `useReducedMotion()` is false.
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/hooks/use-reduced-motion.ts src/hooks/use-round-clock.ts src/components/games/verbs tests/verb-ui.test.mjs && git commit -m "Verb Games: shared piece, HUD, reason and choice components"`

### Task 13: Verbs home, picker and the Games hub section

**Files:**
- Create: `src/lib/verb-games/load-patterns.ts`, `src/components/games/verbs/VerbsSection.tsx`, `VerbsHome.tsx`, `VerbPicker.tsx`, `e2e/verb-games.spec.ts`
- Modify: `src/components/games/GamesHub.tsx:261` (render `<VerbsSection />` between the header and Today's Challenge), `playwright.config.ts:36,42` (add `verb-games` to both `testMatch` lists), `scripts/smoke-e2e.mjs:23-29` (add `"e2e/verb-games.spec.ts"`)
- Test: `tests/verb-ui.test.mjs` (add cases)

**Interfaces:**
- Consumes: `useApp()` (`state.selectedLanguage`, `state.activeModuleId`), `useVerbDevice`, `parseVerbRoute` / `verbRouteSearch`, `frameSlots`, `levelAvailable`, `familyMastery`, `suggestedFamily`.
- Produces: `export function loadPatternData(): Promise<PatternData>` (cached `import("@/data/verb-patterns/es.json")`); `export function VerbsSection(): JSX.Element` (reads `window.location.search`, `history.pushState` on navigation, `popstate` listener; non-Spanish → card "Verb Games are Spanish-only for now"); `export function VerbsHome(p: { data: PatternData; device: VerbDeviceState; moduleId: string | null; go(s: VerbScreen): void })`; `export function VerbPicker(p: { data; device; moduleId; game: GameId; family: FamilyId | "mix" | null; go; onSettings(s: VerbDeviceState["settings"]): void })`.
- Home: eyebrow `VERBS`, Playfair title `Practice by pattern`; ladder = two-column grid of the seven families with meter (`familyMastery`), a "Suggested" mark on `suggestedFamily`; cards for Bubble Pop and Verb Crush with personal best (`bests`) and weekly rank (`ranks`, else `—`); each family tile links to its unit.
- Picker: family list + `Mix`; source chips `Your module · N verbs` (hidden without a module) / `Core · N verbs` / `Both`; Crush level rows with `label` and goal, disabled when `!levelAvailable`; `List mode` toggle; Start disabled when the slot set is empty.
- Dev only (`import.meta.env.DEV`): `?vseed=<n>` fixes the seed.

- [ ] **Step 1: Write the failing test** (render `VerbsHome` and `VerbPicker` with `miniData()`):
```js
test("home shows the ladder and both games", () => {
  const h = html(VerbsHome, { data: miniData(), device: EMPTY_VERB_DEVICE, moduleId: null, go() {} });
  for (const label of ['The "-go" family', "e → ie", "o → ue", "e → i", "Regular -ar", "Bubble Pop", "Verb Crush"]) assert.ok(h.includes(label), label);
});
test("picker disables unreachable Crush levels and shows source counts", () => {
  const h = html(VerbPicker, { data: miniData(), device: EMPTY_VERB_DEVICE, moduleId: "roofing", game: "crush", family: "es.present.go-yo", go() {}, onSettings() {} });
  assert.match(h, /Your module · 3 verbs/);
  assert.match(h, /data-level="2"[^>]*disabled/);
});
```
- [ ] **Step 2: Run** `node --test tests/verb-ui.test.mjs` — expect the new cases to fail (module-not-found).
- [ ] **Step 3: Implement** the loader, section, home and picker; insert `<VerbsSection />` in GamesHub; register the spec in Playwright and smoke.
- [ ] **Step 4: Run** `node --test tests/verb-ui.test.mjs` — expect pass.
- [ ] **Step 5: E2E** — create `e2e/verb-games.spec.ts` with a shared `openVerbs(page)` helper (seed `{ activeModuleId: null, selectedLanguage: "Spanish", currentTab: "games" }` via `seedAppState`, `page.goto(appUrl({ tab: "games" }))`, retry ×3 like `dictionary-roofing.spec.ts`) and test `verbs home lists families and games` asserting `getByText('The "-go" family')` and the two game cards; plus a `@screens` test (skipped unless `VERB_SCREENS=1`) that, for each entry in `const SCREENS = [{ name: "home", path: appUrl({ tab: "games" }) }]`, opens contexts at 375×812@2, 1440×900@1, 2560×1440@1, 2560×1440@2, asserts `document.documentElement.scrollWidth <= innerWidth`, and saves `test-results/verb-games-screens/<name>-<375|1440|2560|2560x2>.png`. Run `npx playwright test e2e/verb-games.spec.ts --project=setup --project=desktop --project=iphone-pwa` — expect pass.
- [ ] **Step 6: Screens** — run `VERB_SCREENS=1 npx playwright test e2e/verb-games.spec.ts --project=setup --project=desktop --grep @screens`; Read all four `home-*.png`; confirm navy/gold tokens, Playfair title, two-column ladder at 375, no overlap or clipped text at 2560.
- [ ] **Step 7: Commit** `git add src/lib/verb-games/load-patterns.ts src/components/games/verbs src/components/games/GamesHub.tsx e2e/verb-games.spec.ts playwright.config.ts scripts/smoke-e2e.mjs tests/verb-ui.test.mjs && git commit -m "Verb Games: Verbs section, home and picker in Games"`

### Task 14: Bubble Pop game screen with list mode

**Files:**
- Create: `src/components/games/verbs/BubblePopGame.tsx`
- Modify: `src/components/games/verbs/VerbsSection.tsx` (render on `play` + `bubble`)
- Test: `tests/verb-ui.test.mjs` (add case), `e2e/verb-games.spec.ts` (add tests)

**Interfaces:**
- Consumes: `createBubbleRound`, `useRoundClock`, `useReducedMotion`, Task 12 primitives.
- Produces: `export function BubblePopGame(p: { data: PatternData; config: RoundConfig; onEnd(log: RoundLog, result: RoundResult): void; onSaveCard(c: Completion): void })`.
- Behavior: eyebrow `GAME · BUBBLE POP · {family label | MIX}`; frame `{prompt} · {english} · {infinitive}`; pieces as whole-form `PieceTile`s rising (`transform` only) or, under reduced motion / list mode, a still row (`data-motion="still"`) with a countdown bar; keys `1`–`6`; miss dims the bubble and shows `ReasonBand` for `REASON_MS`; `LiveRegion` announces target, completion with English, and miss reason; list mode renders `FrameChoices`. Each piece `data-testid="bubble"`; dev builds add `data-correct="true"` on the answer. `stopRemoteTTS()` on unmount. `log.endedAt = new Date().toISOString()`, `clientRoundId = crypto.randomUUID()`, `dataHash = data.dataHash`.

- [ ] **Step 1: Write the failing test:**
```js
test("bubble screen renders frame, legend and numbered pieces", () => {
  const h = html(BubblePopGame, { data: miniData(), config: bubbleCfg, onEnd() {}, onSaveCard() {} });
  assert.match(h, /GAME · BUBBLE POP · THE &quot;-GO&quot; FAMILY/);
  assert.equal((h.match(/data-testid="bubble"/g) ?? []).length, 4);
  assert.match(h, /data-testid="reason-band"/);
});
```
- [ ] **Step 2: Run** `node --test tests/verb-ui.test.mjs` — expect the new case to fail.
- [ ] **Step 3: Implement** `BubblePopGame.tsx` and the section wiring (on end, show a placeholder `Round over · {score}` until Task 16).
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: E2E** — add `bubble pop: one pop shows the English` (Games → Verbs → Bubble Pop → `The "-go" family` → Start with `?vseed=5` → click `[data-correct="true"]` → expect text matching `/· I (come|have|leave|put|say)/`) and `bubble pop reduced motion holds bubbles still` (`page.emulateMedia({ reducedMotion: "reduce" })`, expect every `[data-testid="bubble"]` inside `[data-motion="still"]`). Tag both `@dev-only`. Run `npx playwright test e2e/verb-games.spec.ts --project=setup --project=desktop --project=iphone-pwa` — expect pass.
- [ ] **Step 6: Screens** — add `{ name: "bubble", path: <play URL with vseed=5> }` to `SCREENS`; run the `@screens` command; Read the four `bubble-*.png`; confirm shapes + labels legible, reason band does not overlap the board, HUD on one line at 375.
- [ ] **Step 7: Commit** `git add src/components/games/verbs e2e/verb-games.spec.ts tests/verb-ui.test.mjs && git commit -m "Verb Games: Bubble Pop screen with list mode"`

### Task 15: Verb Crush game screen

**Files:**
- Create: `src/components/games/verbs/VerbCrushGame.tsx`
- Modify: `src/components/games/verbs/VerbsSection.tsx` (render on `play` + `crush`)
- Test: `tests/verb-ui.test.mjs` (add case), `e2e/verb-games.spec.ts` (add tests)

**Interfaces:**
- Consumes: `createCrushRound`, `adjacent`, Task 12 primitives.
- Produces: `export function VerbCrushGame(p: { data: PatternData; config: RoundConfig; onEnd(log: RoundLog, result: RoundResult): void; onSaveCard(c: Completion): void })`.
- Behavior: eyebrow `GAME · VERB CRUSH · LEVEL {n}`; goal box `{level.label}` with slots filled as pops land; 5×5 grid of `PieceTile` buttons (`data-testid="crush-cell"`, `data-index`); tap-tap or drag swaps neighbors; keyboard: arrows move focus, Enter selects, Enter on a neighbor swaps; pops fade (`opacity`) under reduced motion, else scale/opacity; trap shakes (dims under reduced motion) and shows `ReasonBand`; HUD shows moves left. Dev builds mark `findPopSwap()` cells with `data-hint="a"` / `data-hint="b"`.

- [ ] **Step 1: Write the failing test:**
```js
test("crush screen renders 25 labelled cells and the goal", () => {
  const h = html(VerbCrushGame, { data: miniData(), config: crushCfg, onEnd() {}, onSaveCard() {} });
  assert.equal((h.match(/data-testid="crush-cell"/g) ?? []).length, 25);
  assert.match(h, /GAME · VERB CRUSH · LEVEL 1/); assert.match(h, /Make 5 yo forms/);
});
```
- [ ] **Step 2: Run** `node --test tests/verb-ui.test.mjs` — expect failure.
- [ ] **Step 3: Implement** the component and wiring.
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: E2E** — add `crush level 1: one pop shows the English` (click `[data-hint="a"]` then `[data-hint="b"]`, expect `/· I /` text and goal `1 / 5`) and `crush reduced motion` (emulate reduce, pop, expect no element with class `animate-` inside the grid). Tag `@dev-only`. Run the Playwright command — expect pass.
- [ ] **Step 6: Screens** — add `{ name: "crush", … }`; run `@screens`; Read four `crush-*.png`; confirm the grid stays square, tiles ≥ 44 px at 375, chevron/rounded shapes distinguishable.
- [ ] **Step 7: Commit** `git add src/components/games/verbs e2e/verb-games.spec.ts tests/verb-ui.test.mjs && git commit -m "Verb Crush screen with keyboard swaps"`

### Task 16: Round recap

**Files:**
- Create: `src/components/games/verbs/RoundRecap.tsx`
- Modify: `src/components/games/verbs/VerbsSection.tsx` (on end: `recordRound` into the device store, then show the recap)
- Test: `tests/verb-ui.test.mjs`, `e2e/verb-games.spec.ts`

**Interfaces:**
- Produces: `export function RoundRecap(p: { result: RoundResult; best: { score: number } | null; placement: { rank: number | null; period: string } | null; signedIn: boolean; onPlayAgain(): void; onPractice(f: FamilyId): void; onBack(): void; onSendCards(items: { infinitive: string; person: Person }[]): void; savedKeys: string[] })`.
- Content order: score, best streak, personal best (`New best` when beaten), board placement (`Weekly #n` / `Sign in to join the board` when guest / nothing when boards closed), misses grouped by family label with `attempted ✗ → correct · english`, per-row `Send to cards`, `Send all`, then `Play again`, `Practice this family` (the family with most misses), `Back`. Sent rows show `Saved on this device`.

- [ ] **Step 1: Write the failing test:**
```js
test("recap groups misses by family with the correct form and English", () => {
  const h = html(RoundRecap, { result: sampleResultWithMisses, best: { score: 120 }, placement: null, signedIn: false, savedKeys: [], onPlayAgain() {}, onPractice() {}, onBack() {}, onSendCards() {} });
  assert.match(h, /The &quot;-go&quot; family[\s\S]*salo ✗ → salgo · I leave/);
  assert.match(h, /Sign in to join the board/); assert.match(h, /Send all/); assert.match(h, /Practice this family/);
});
```
- [ ] **Step 2: Run** — expect failure.
- [ ] **Step 3: Implement** the recap and wiring (`onSendCards` is a no-op until Task 23).
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: E2E** — extend the Bubble and Crush pop tests: wait out the round with `page.clock` (`await page.clock.install()` before opening, `await page.clock.fastForward(61_000)`), expect `Round over` heading and `Play again`. Run the Playwright command — expect pass.
- [ ] **Step 6: Screens** — add `recap`; run `@screens`; Read four `recap-*.png`; confirm rows wrap without overflow at 375.
- [ ] **Step 7: Commit** `git add src/components/games/verbs e2e/verb-games.spec.ts tests/verb-ui.test.mjs && git commit -m "Verb Games: round recap"`

### Task 17: Supabase migration and SQL fixture

**Files:**
- Create: `supabase/migrations/20261020120000_verb_games.sql`, `tests/sql/verb-games.sql`, `scripts/qa/test-verb-games-db.mjs`
- Modify: `docs/verb-games.md` (section "Database": owner applies the migration; tables and RPCs listed)

**Interfaces:**
- Produces tables: `verb_rounds(id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, client_round_id uuid not null, game text, scope text, language text, tense text, score int, moves int, duration_ms int, picks int, correct int, best_streak int, reduced_motion bool, list_mode bool, ranked bool, period text, round_log jsonb, created_at timestamptz default now(), unique(user_id, client_round_id))`; `verb_best(user_id, game, scope, period, score, moves, round_id, updated_at, primary key(user_id, game, scope, period))` (ranked rounds only, periods `all` and `YYYY-Www`); `verb_leaderboard_names(user_id pk, handle text null, status text check in ('ok','pending','blocked') default 'ok', updated_at)` with `unique index on lower(handle)`; `verb_handle_reports(reporter_id, target_user_id, created_at, primary key(reporter_id, target_user_id))`.
- RLS: all four `enable row level security`, `revoke all … from public, anon, authenticated`, `grant select, insert, update, delete … to service_role`, plus one `as restrictive for all to anon, authenticated using (false) with check (false)` policy each (style of `20261009000000_team_platform.sql` and `20260814201942_add_push_reminder_deny_policies.sql`).
- RPCs (all `language plpgsql security definer set search_path=public`, `revoke all … from public,anon,authenticated`, `grant execute … to service_role`):
```sql
verb_record_round(p_user uuid, p_client_round_id uuid, p_game text, p_scope text, p_score int, p_moves int, p_duration_ms int,
  p_picks int, p_correct int, p_best_streak int, p_reduced_motion bool, p_list_mode bool, p_ranked bool, p_period text, p_round_log jsonb)
  returns jsonb  -- {status:'recorded'|'duplicate'|'rate_limited', score, weekly_best, all_best}; advisory xact lock per user; ≥6 rounds in 60 s or ≥300 in 24 h → rate_limited
verb_top10(p_game text, p_scope text, p_period text) returns table(rank int, handle text, score int)
  -- only status 'ok' handles; excludes users whose raw_user_meta_data has lower(is_kid) in ('true','1','yes') or a parent_id key; order score desc, moves asc, updated_at asc
verb_my_rank(p_user uuid, p_game text, p_scope text, p_period text) returns table(rank int, score int)   -- rank null when not eligible
verb_set_handle(p_user uuid, p_handle text) returns text   -- 'ok' | 'taken' | 'kid' | 'blocked'
verb_report_handle(p_reporter uuid, p_handle text) returns void   -- 3 distinct reporters → status 'pending'
verb_block_user(p_user uuid, p_reason text) returns void   -- upserts status 'blocked' and inserts platform_audit_events(action 'verb_round_rejected', detail {reason})
verb_set_handle_status(p_user uuid, p_status text) returns void   -- owner review
```
- Runner mirrors `scripts/qa/test-shared-module-decks-db.mjs` with `tests/sql/verb-games.sql`. The fixture creates a minimal `public.platform_audit_events(actor_user_id uuid, action text, organization_id uuid, detail jsonb)` before `\ir`.

- [ ] **Step 1: Write the failing SQL fixture** `tests/sql/verb-games.sql` (begin; roles; `create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}')` as in `tests/sql/owner-user-management.sql`; `\ir` the migration; assertions; rollback):
```sql
assert not has_table_privilege('authenticated','public.verb_rounds','SELECT');
assert not has_function_privilege('anon','public.verb_top10(text,text,text)','EXECUTE');
-- duplicate round
assert public.verb_record_round(u1,r1,'bubble','go-yo',500,0,60000,12,10,6,false,false,true,'2026-W43','{}')->>'status'='recorded';
assert public.verb_record_round(u1,r1,'bubble','go-yo',900,0,60000,12,10,6,false,false,true,'2026-W43','{}')->>'status'='duplicate';
assert (select score from verb_best where user_id=u1 and period='2026-W43')=500;
-- same id, other user
assert public.verb_record_round(u2,r1,'bubble','go-yo',400,0,60000,12,10,6,false,false,true,'2026-W43','{}')->>'status'='recorded';
-- kids, parent_id, missing and pending handles never appear
-- (u1 handle crew_lead 500, u2 handle roofer_2 400, kid {"is_kid":true} 990, child {"parent_id":"p"} 980, no-handle 970, pending 960)
assert (select array_agg(handle order by rank) from public.verb_top10('bubble','go-yo','2026-W43'))=array['crew_lead','roofer_2'];
-- handle rules
assert public.verb_set_handle(u3,'Crew_Lead')='taken';
assert public.verb_set_handle(kid,'kiddo')='kid';
-- rate limit: 7th round inside a minute
assert public.verb_record_round(u4,gen_random_uuid(),'bubble','go-yo',1,0,60000,1,1,1,false,false,true,'2026-W43','{}')->>'status'='rate_limited';
-- three reporters make a handle pending; a repeat report counts once
```
- [ ] **Step 2: Run** `node scripts/qa/test-verb-games-db.mjs` — expect psql error `could not open file … 20261020120000_verb_games.sql`.
- [ ] **Step 3: Implement** the migration and runner; update `docs/verb-games.md`.
- [ ] **Step 4: Run** `node scripts/qa/test-verb-games-db.mjs` — expect `ROLLBACK` with no assertion errors.
- [ ] **Step 5: Commit** `git add supabase/migrations/20261020120000_verb_games.sql tests/sql/verb-games.sql scripts/qa/test-verb-games-db.mjs docs/verb-games.md && git commit -m "Verb Games: score tables, restrictive RLS and board RPCs"`

### Task 18: Server helpers — board flag, handles, ISO week, kid check

**Files:**
- Create: `src/lib/verb-games/board-flag.ts`, `src/lib/verb-games/handle.ts`, `src/lib/verb-games/week.ts`
- Modify: `docs/verb-games.md` (section "Public boards flag": `VERB_PUBLIC_BOARDS=true` in Vercel enables boards; keep off until the `api.family-add-kid` auth fix ships, because `user_metadata.is_kid` is user-writable)
- Test: `tests/verb-server-helpers.test.mjs`

**Interfaces:**
- Produces:
```ts
export function publicBoardsEnabled(env: Record<string, string | undefined> = process.env): boolean;  // env.VERB_PUBLIC_BOARDS === "true"
export const HANDLE_BLOCKLIST: readonly string[];                 // impersonation terms (admin, owner, moderator, support, staff, languagethreshold) + profanity list
export function validateHandle(raw: string): { ok: true; handle: string } | { ok: false; error: string };
export function isoWeekKey(date: Date): string;
export function roundPeriod(endedAt: string, now: Date): string;  // endedAt outside [now − 7 d, now + 5 min] or unparsable → now
export function isKidUser(user: { user_metadata?: Record<string, unknown> }): boolean;   // in handle.ts; lower(String(is_kid)) in true|1|yes, or parent_id present — same rule as verb_top10
```
- Block-list match: lowercase, `0→o 1→i 3→e 4→a 5→s 7→t`, underscores removed, substring match.

- [ ] **Step 1: Write the failing test:**
```js
test("flag is off unless exactly true", () => {
  assert.equal(publicBoardsEnabled({}), false);
  assert.equal(publicBoardsEnabled({ VERB_PUBLIC_BOARDS: "TRUE" }), false);
  assert.equal(publicBoardsEnabled({ VERB_PUBLIC_BOARDS: "true" }), true);
});
test("handles", () => {
  assert.deepEqual(validateHandle("  crew_lead7 "), { ok: true, handle: "crew_lead7" });
  assert.deepEqual(validateHandle("ab"), { ok: false, error: "Use 3–20 letters, numbers or underscores." });
  assert.deepEqual(validateHandle("jo@x.com"), { ok: false, error: "Use 3–20 letters, numbers or underscores." });
  assert.deepEqual(validateHandle("Adm1n_99"), { ok: false, error: "That name is not available." });
});
test("ISO weeks across the 53-week year", () => {
  assert.equal(isoWeekKey(new Date("2025-12-29T00:00:00Z")), "2026-W01");
  assert.equal(isoWeekKey(new Date("2026-12-31T23:59:59Z")), "2026-W53");
  assert.equal(isoWeekKey(new Date("2027-01-01T12:00:00Z")), "2026-W53");
  assert.equal(isoWeekKey(new Date("2027-01-04T00:00:00Z")), "2027-W01");
  assert.equal(roundPeriod("2026-01-01T00:00:00Z", new Date("2026-10-20T12:00:00Z")), "2026-W43");
});
test("kid detection fails closed", () => {
  for (const m of [{ is_kid: true }, { is_kid: "true" }, { parent_id: "p" }]) assert.equal(isKidUser({ user_metadata: m }), true);
  assert.equal(isKidUser({ user_metadata: {} }), false);
});
```
- [ ] **Step 2: Run** `node --test tests/verb-server-helpers.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** the three files and doc section.
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/board-flag.ts src/lib/verb-games/handle.ts src/lib/verb-games/week.ts docs/verb-games.md tests/verb-server-helpers.test.mjs && git commit -m "Verb Games: board flag, handle rules, ISO week, kid check"`

### Task 19: Score server and /api/verb-score route

**Files:**
- Create: `src/lib/verb-games/score-server.ts`, `src/lib/verb-games/server-data.ts`, `src/routes/api.verb-score.ts`
- Modify: `src/routeTree.gen.ts` (regenerated by `npx vite build --mode development` or the dev server; commit the result)
- Test: `tests/verb-score-function.test.mjs`

**Interfaces:**
- Consumes: `teamAdminClient(undefined, request)`, `authenticatedUser(request, db)`, `json(data, status)`, `scopedTeamError(error)`, `TeamOperationError` from `src/lib/team-server.ts` (auditing of rejected rounds happens inside `verb_block_user`); `prepareTeamJson(request, schema, MAX_TEAM_WORKFLOW_BYTES)` from `src/lib/team-request.ts`; `scoreRound`; Task 18 helpers.
- Produces:
```ts
export interface VerbDb { rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> }
export class VerbRateLimited extends Error {}
export const RoundLogSchema: z.ZodType<RoundLog>;   // strips unknown keys; ≤ 1000 events; uuid ids; ISO endedAt
export async function submitVerbRound(db: VerbDb, user: User, log: RoundLog, now: Date, data?: PatternData):
  Promise<{ status: "recorded" | "duplicate" | "stale"; score: number | null; ranked: boolean; weeklyBest: number | null; allTimeBest: number | null }>;
export async function readVerbBoard(db: VerbDb, user: User | null, game: GameId, scope: string, now: Date, env?: Record<string, string | undefined>):
  Promise<{ boards: "closed" } | { boards: "open"; period: string; rows: { rank: number; handle: string; score: number }[];
    you: { rank: number | null; score: number } | null; handle: { handle: string | null; status: string } | null }>;
export async function setVerbHandle(db: VerbDb, user: User, raw: string, env?: …): Promise<{ handle: string; status: "ok" }>;
export async function reportVerbHandle(db: VerbDb, user: User, handle: string, env?: …): Promise<{ reported: true }>;
// server-data.ts
export const SERVER_PATTERN_DATA: PatternData;      // static import of "@/data/verb-patterns/es.json"
// api.verb-score.ts
export const Route = createFileRoute("/api/verb-score")({ server: { handlers: { GET, POST } } });
```
- Submit flow: stale verdict → `{status:"stale"}`, no RPC; hard verdict → `rpc("verb_block_user", { p_user, p_reason })` → `TeamOperationError("This round could not be verified.", 400)`; ok → `rpc("verb_record_round", …)` with the replayed numbers, `p_ranked = verdict.ranked`, `p_period = roundPeriod(log.endedAt, now)`; `rate_limited` → `VerbRateLimited`. Board/handle/report with the flag off → `{boards:"closed"}` / `TeamOperationError("Public boards are not open yet.", 403)`. Kid → `setVerbHandle` throws `TeamOperationError("Boards are hidden for family kid profiles.", 403)`.
- Route: POST body `z.discriminatedUnion("action", [{action:"submit", log}, {action:"handle", handle}, {action:"report", handle}])` via `prepareTeamJson`; GET `?game=&scope=` with optional bearer (anonymous allowed for rows); `VerbRateLimited` → `json({ error: "Too many rounds. Try again in a minute." }, 429)`; everything else → `scopedTeamError`.

- [ ] **Step 1: Write the failing test** (`loadModule("src/lib/verb-games/score-server.ts")`, fake `db` recording `rpc` calls, `miniData()` passed as `data`):
```js
test("tampered score is ignored; the server's replay is written", async () => {
  const { log, result } = playHonest(miniData(), base("bubble"));
  const db = fakeDb({ verb_record_round: { status: "recorded", score: result.score, weekly_best: result.score, all_best: result.score } });
  const out = await submitVerbRound(db, adult, RoundLogSchema.parse({ ...log, score: 999999 }), NOW, miniData());
  assert.equal(db.calls[0].args.p_score, result.score); assert.equal(out.score, result.score);
});
test("stale round writes nothing and blocks nobody", async () => {      // Review Focus 1
  const db = fakeDb({});
  const { log } = playHonest(miniData(), base("bubble"));
  assert.equal((await submitVerbRound(db, adult, { ...log, dataHash: "0000000000000000" }, NOW, miniData())).status, "stale");
  assert.deepEqual(db.calls, []);
});
test("duplicate returns stored result without a second best", async () => {   // Review Focus 5
  const db = fakeDb({ verb_record_round: { status: "duplicate", score: 500, weekly_best: 500, all_best: 500 } });
  const { log } = playHonest(miniData(), base("bubble"));
  assert.equal((await submitVerbRound(db, adult, log, NOW, miniData())).status, "duplicate");
  assert.equal(db.calls.length, 1);
});
test("hard failure blocks and audits; rate limit trips", async () => {
  const db = fakeDb({ verb_block_user: null, verb_record_round: { status: "rate_limited" } });
  const cheatLog = { ...playHonest(miniData(), base("bubble")).log }; cheatLog.events = [...cheatLog.events].reverse();
  await assert.rejects(submitVerbRound(db, adult, cheatLog, NOW, miniData()), /could not be verified/);
  assert.equal(db.calls[0].fn, "verb_block_user");
  await assert.rejects(submitVerbRound(db, adult, playHonest(miniData(), base("crush")).log, NOW, miniData()), VerbRateLimited);
});
test("kid round records but kid cannot take a handle; boards closed by default", async () => {
  const db = fakeDb({ verb_record_round: { status: "recorded", score: 100, weekly_best: 100, all_best: 100 } });
  await submitVerbRound(db, kid, playHonest(miniData(), base("bubble")).log, NOW, miniData());
  assert.equal(db.calls[0].args.p_user, kid.id);
  await assert.rejects(setVerbHandle(db, kid, "kiddo", { VERB_PUBLIC_BOARDS: "true" }), /family kid profiles/);
  assert.deepEqual(await readVerbBoard(db, adult, "bubble", "go-yo", NOW, {}), { boards: "closed" });
});
```
- [ ] **Step 2: Run** `node --test tests/verb-score-function.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** the three files; start `npx vite dev --port 3210` briefly (or run the dev build) so `src/routeTree.gen.ts` regenerates with `/api/verb-score`.
- [ ] **Step 4: Run** `node --test tests/verb-score-function.test.mjs && npx tsc --noEmit` — expect pass, no type errors.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/score-server.ts src/lib/verb-games/server-data.ts src/routes/api.verb-score.ts src/routeTree.gen.ts tests/verb-score-function.test.mjs && git commit -m "Verb Games: server replay scoring and board endpoint"`

### Task 20: Client submission and offline queue

**Files:**
- Create: `src/lib/verb-games/score-client.ts`
- Modify: `src/components/games/verbs/VerbsSection.tsx` (after `recordRound`: signed in → `submitOrQueue`; on mount and `online` → `flushQueue`; store `ranks` from responses)
- Test: `tests/verb-score-client.test.mjs`

**Interfaces:**
- Produces:
```ts
export interface ScoreClientDeps { token(): Promise<string | null>; fetch: typeof fetch; online(): boolean }
export type SubmitOutcome = { kind: "sent"; status: "recorded" | "duplicate" | "stale"; weeklyBest: number | null; ranked: boolean }
  | { kind: "queued" } | { kind: "dropped"; error: string };
export async function submitOrQueue(log: RoundLog, deps: ScoreClientDeps): Promise<SubmitOutcome>;
export async function flushQueue(queue: readonly RoundLog[], deps: ScoreClientDeps): Promise<{ remaining: RoundLog[]; outcomes: SubmitOutcome[] }>;
export async function fetchBoard(game: GameId, scope: string, deps: ScoreClientDeps): Promise<Awaited<ReturnType<typeof readVerbBoard>>>;
export async function postHandle(handle: string, deps: ScoreClientDeps): Promise<{ handle: string; status: "ok" }>;
export async function postReport(handle: string, deps: ScoreClientDeps): Promise<void>;
export function browserScoreDeps(): ScoreClientDeps;   // supabase.auth.getSession() token, window.fetch, navigator.onLine
```
- Queue rules: offline, network error, 429, 403, 5xx → keep (stop flushing at the first 429); 200 (`recorded`/`duplicate`/`stale`) → remove; 400 → drop. Guests never queue (VerbsSection passes `queue: false`).

- [ ] **Step 1: Write the failing test:**
```js
test("offline rounds queue and flush idempotently", async () => {
  const off = await submitOrQueue(log1, deps({ online: false }));
  assert.deepEqual(off, { kind: "queued" });
  const net = deps({ responses: [[200, { status: "recorded", weeklyBest: 500, ranked: true }], [200, { status: "duplicate", weeklyBest: 500, ranked: true }]] });
  const { remaining } = await flushQueue([log1, log1], net);
  assert.deepEqual(remaining, []); assert.equal(net.requests[0].headers.Authorization, "Bearer t");
});
test("queue drops stale rounds", async () => {                        // Review Focus 1
  const { remaining, outcomes } = await flushQueue([log1], deps({ responses: [[200, { status: "stale", weeklyBest: null, ranked: false }]] }));
  assert.deepEqual(remaining, []); assert.equal(outcomes[0].status, "stale");
});
test("rate limit keeps the rest of the queue", async () => {
  const { remaining } = await flushQueue([log1, log2], deps({ responses: [[429, { error: "Too many rounds. Try again in a minute." }]] }));
  assert.deepEqual(remaining.map((l) => l.clientRoundId), [log1.clientRoundId, log2.clientRoundId]);
});
```
- [ ] **Step 2: Run** `node --test tests/verb-score-client.test.mjs` — expect module-not-found.
- [ ] **Step 3: Implement** `score-client.ts` and the section wiring.
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/score-client.ts src/components/games/verbs/VerbsSection.tsx tests/verb-score-client.test.mjs && git commit -m "Verb Games: score submission with offline queue"`

### Task 21: Leaderboard screen

**Files:**
- Create: `src/components/games/verbs/VerbBoard.tsx`
- Modify: `src/components/games/verbs/VerbsSection.tsx` (`board` screen; links from home cards and recap)
- Test: `tests/verb-ui.test.mjs`, `e2e/verb-games.spec.ts`

**Interfaces:**
- Produces: `export function VerbBoard(p: { game: GameId; scope: string | null; scopes: { key: string; label: string }[]; board: Awaited<ReturnType<typeof fetchBoard>> | null; personalBest: number | null; signedIn: boolean; onScope(key: string): void; onGame(g: GameId): void; onHandle(h: string): Promise<void>; onReport(h: string): Promise<void> })`.
- Closed: personal best + `Public boards open soon. Your scores are saved.` Open: eyebrow `WEEKLY · TOP 10`, game and scope selectors, rows `#rank handle score` (mono), your row pinned below when outside Top 10 (`You · #rank` or `You · not ranked`), `Report name` per row (confirm then `onReport`), handle form when signed in without a handle; guest → `Sign in to join the board`. All-time tab rendered disabled with `Coming soon`.

- [ ] **Step 1: Write the failing test:**
```js
test("closed board shows only the personal best", () => {
  const h = html(VerbBoard, { ...boardProps, board: { boards: "closed" }, personalBest: 840 });
  assert.match(h, /Public boards open soon/); assert.match(h, /840/); assert.doesNotMatch(h, /Report name/);
});
test("open board lists handles and pins your row", () => {
  const h = html(VerbBoard, { ...boardProps, board: { boards: "open", period: "2026-W43", rows: tenRows, you: { rank: 14, score: 300 }, handle: { handle: "me_1", status: "ok" } } });
  assert.equal((h.match(/Report name/g) ?? []).length, 10); assert.match(h, /You · #14/); assert.doesNotMatch(h, /@/);
});
```
- [ ] **Step 2: Run** — expect failure.
- [ ] **Step 3: Implement** the screen and wiring (`fetchBoard` on open).
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: E2E** — add `board closed by default` (open board from the Bubble card, expect `Public boards open soon`) and `open board renders Top 10` (`page.route("**/api/verb-score?*", …)` fulfilling an open board with 10 rows, expect 10 `Report name` buttons). Run the Playwright command — expect pass.
- [ ] **Step 6: Screens** — add `board` (with the route mock) to `SCREENS`; run `@screens`; Read four `board-*.png`; confirm the pinned row is visually separated and selectors fit at 375.
- [ ] **Step 7: Commit** `git add src/components/games/verbs e2e/verb-games.spec.ts tests/verb-ui.test.mjs && git commit -m "Verb Games: weekly Top 10 board screen behind the flag"`

### Task 22: Verb Cards deck in flashcard state

**Files:**
- Create: `src/lib/verb-games/cards.ts`
- Modify: `src/state/flashcard-state.tsx` — `FlashcardEntry` (L50-66: add `verbKey?: string`), `Action` union (L71-133: add `ADD_VERB_CARDS`), `matchesSection` (L285-290), reducer before `default:` (L560), `Ctx` type (L563-598) and `value` (L720-758: add `addVerbCards`)
- Test: `tests/verb-cards.test.mjs`

**Interfaces:**
- Produces:
```ts
// flashcard-state.tsx
export const VERB_CARDS_SECTION = "verb-cards";
export function verbCardId(language: Language, verbKey: string): string;      // `verb:${language}:${verbKey}`
export interface VerbCardInput { word: string; translation: string; example: string; exampleTranslation: string; verbKey: string; moduleId?: string }
// action { type: "ADD_VERB_CARDS"; payload: { language: Language; cards: VerbCardInput[]; now?: number } }
// context: addVerbCards(language: Language, cards: VerbCardInput[]): void
// cards.ts
export function verbKeyOf(infinitive: string, person: Person): string;          // "tener|yo"
export function verbCardInputs(data: PatternData, items: { infinitive: string; person: Person }[], moduleId?: string): VerbCardInput[];
```
- New cards: `category: "conjugated"`, `source: "user"`, existing id → untouched (keeps SRS); when nothing is added the reducer returns the same `state` object. `matchesSection`: a card with `verbKey` matches only `VERB_CARDS_SECTION` (or its `module:` section). Example = lesson sentence with the blank filled, else `""`.

- [ ] **Step 1: Write the failing test** (reducer bundled with `export { reducer as reduce }` exactly as `tests/authored-module-deck.test.mjs`):
```js
test("verb cards are conjugated, idempotent and in their own section", () => {
  const input = verbCardInputs(miniData(), [{ infinitive: "tener", person: "yo" }], "roofing");
  assert.deepEqual(input[0], { word: "tengo", translation: "I have", example: "", exampleTranslation: "", verbKey: "tener|yo", moduleId: "roofing" });
  let s = reduce(initial, { type: "ADD_VERB_CARDS", payload: { language: "Spanish", cards: input, now: 1 } });
  const card = s.cards["verb:Spanish:tener|yo"];
  assert.deepEqual([card.category, card.source, card.verbKey], ["conjugated", "user", "tener|yo"]);
  const reviewed = reduce(s, { type: "REVIEW_CARD", payload: { id: card.id, grade: "good", now: 2 } });
  assert.equal(reduce(reviewed, { type: "ADD_VERB_CARDS", payload: { language: "Spanish", cards: input, now: 3 } }), reviewed);
});
```
plus a section test: a `verbKey` card matches `["verb-cards"]` and not `["conjugated"]` (export `matchesSection` the same way).
- [ ] **Step 2: Run** `node --test tests/verb-cards.test.mjs` — expect failure.
- [ ] **Step 3: Implement** `cards.ts` and the state changes.
- [ ] **Step 4: Run** `node --test tests/verb-cards.test.mjs tests/authored-module-deck.test.mjs` — expect pass.
- [ ] **Step 5: Commit** `git add src/lib/verb-games/cards.ts src/state/flashcard-state.tsx tests/verb-cards.test.mjs && git commit -m "Flashcards: device-only Verb Cards deck"`

### Task 23: Send to cards and the Verb Card back

**Files:**
- Create: `src/components/flashcards/VerbCardBack.tsx`
- Modify: `src/components/games/verbs/VerbsSection.tsx` (wire `onSendCards` / `onSaveCard` to `addVerbCards`, toast `Saved on this device`), `src/components/flashcards/FlashcardsStudio.tsx` — `availableCategories` (L223-229: add `VERB_CARDS_SECTION`), chip label (L967-969: `Verb Cards`), card panel after the conjugation block (L865-893: render `VerbCardBack` when `activeCard?.verbKey`)
- Test: `tests/verb-ui.test.mjs`, `e2e/verb-games.spec.ts`

**Interfaces:**
- Produces: `export function VerbCardBack(p: { verbKey: string; data: PatternData | null; onSpeak(text: string): void })` — English for the card's person, family pills (`-go yo form`, `e → ie`, …, from `familyById(...).label`), full table `form · English` for all five persons with the ending gold, tense selector `Present` active and `Past` / `Future` disabled with `Coming soon`. `data` null → renders nothing (loader pending).

- [ ] **Step 1: Write the failing test:**
```js
test("verb card back shows pills, the table with English and the tense selector", () => {
  const h = html(VerbCardBack, { verbKey: "tener|tú", data: miniData(), onSpeak() {} });
  assert.match(h, /you have/); assert.match(h, /e → ie/); assert.match(h, /tenemos[\s\S]*we have/);
  assert.match(h, /<button[^>]*disabled=""[^>]*>Past<\/button>/); assert.match(h, /Coming soon/);
});
```
- [ ] **Step 2: Run** — expect failure.
- [ ] **Step 3: Implement** the back, Studio changes and recap/game wiring (long-press or right-click on `CompletionFlash` saves without pausing).
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: E2E** — add `recap send to cards lands in Verb Cards` (play Bubble with `vseed`, pick one wrong bubble then the right one, fast-forward to recap, click the first `Send to cards`, expect `Saved on this device`; go to `appUrl({ tab: "flashcards" })`, expect the `Verb Cards` chip with count `1`, open it and expect the table text `we have`). Run the Playwright command — expect pass.
- [ ] **Step 6: Screens** — add `verb-card` (flashcards with one seeded verb card) to `SCREENS`; run `@screens`; Read four `verb-card-*.png`; confirm the table and pills fit beside the existing card layout at 1440 and stack at 375.
- [ ] **Step 7: Commit** `git add src/components/flashcards src/components/games/verbs e2e/verb-games.spec.ts tests/verb-ui.test.mjs && git commit -m "Verb Games: Send to cards and Verb Card back"`

### Task 24: Pattern unit — See / Hear / Recall

**Files:**
- Create: `src/components/games/verbs/PatternUnit.tsx`
- Modify: `src/components/games/verbs/VerbsSection.tsx` (`unit` screen)
- Test: `tests/verb-ui.test.mjs`, `e2e/verb-games.spec.ts`

**Interfaces:**
- Consumes: `speakRemote(text, "es-ES", { usage: "learning", signal })` and `stopRemoteTTS()` from `src/lib/tts.ts`; `forFrame`, `buildFrame`, `frameSlots`, `FrameChoices`, `recordPicks`, `markStep`, `verbCardInputs`.
- Produces: `export function PatternUnit(p: { data: PatternData; family: FamilyId; device: VerbDeviceState; source: SourceFilter; onDevice(fn: (s: VerbDeviceState) => VerbDeviceState): void; onAddCards(items: { infinitive: string; person: Person }[]): void; onPlay(f: FamilyId): void })`.
- Layout (mock `verbs-unit.html`): eyebrow `PATTERN · {label}`, Playfair title = label, rule, mastery meter (`familyMastery`, "3 of 6 verbs mastered"), verb list with per-form English; ladder of six steps with See / Hear / Recall active and Type / Say / Write disabled `Coming soon`; See = table with endings gold (marks `see`); Hear = a play button per form calling `speakRemote` (marks `hear` on first play; aborts on unmount); Recall = 10 items of `FrameChoices` with 4 options (answer + `forFrame(…, 3, rng)`), picks → `recordPicks`, marks `recall` at the end; buttons `Add family to cards` (every form of every pool verb in the family) and `Play a game` (picker preselected). Opens at the first unfinished step.

- [ ] **Step 1: Write the failing test:**
```js
test("unit shows rule, English per form and a six-step ladder", () => {
  const h = html(PatternUnit, { data: miniData(), family: "es.present.go-yo", device: EMPTY_VERB_DEVICE, source: { kind: "core" }, onDevice() {}, onAddCards() {}, onPlay() {} });
  assert.match(h, /PATTERN · THE &quot;-GO&quot; FAMILY/); assert.match(h, /tengo[\s\S]*I have/);
  for (const s of ["See it", "Hear it", "Recall it", "Type it", "Say it", "Write it"]) assert.ok(h.includes(s));
  assert.match(h, /Add family to cards/); assert.match(h, /Play a game/);
});
```
- [ ] **Step 2: Run** — expect failure.
- [ ] **Step 3: Implement** the unit and routing.
- [ ] **Step 4: Run** — expect pass.
- [ ] **Step 5: E2E** — add `unit: see, recall, add family to cards` (open home → `The "-go" family` → expect `tengo` and `I have`; Recall → four options; `page.route("**/api/tts**", r => r.fulfill({ status: 204 }))` before clicking a Hear button; `Add family to cards` → `Saved on this device`). Run the Playwright command — expect pass.
- [ ] **Step 6: Screens** — add `unit`; run `@screens`; Read four `unit-*.png`; confirm ladder steps and meter match the mock's proportions without overlap.
- [ ] **Step 7: Commit** `git add src/components/games/verbs e2e/verb-games.spec.ts tests/verb-ui.test.mjs && git commit -m "Verb Games: pattern unit with See, Hear and Recall"`

### Task 25: Integration — cross-links, home stats, accessibility and performance

**Files:**
- Modify: `src/components/games/verbs/VerbsSection.tsx`, `VerbsHome.tsx`, `RoundRecap.tsx`, `PatternUnit.tsx`, `e2e/verb-games.spec.ts`, `docs/verb-games.md` (section "What ships in Phase 1" and "Known limits": client-chosen seeds, user-writable `is_kid`)
- Test: `tests/verb-ui.test.mjs`, `e2e/verb-games.spec.ts`

**Interfaces:**
- Consumes everything above. Produces (in `PatternUnit.tsx`): `export function firstUnfinishedStep(steps: VerbDeviceState["unitSteps"], family: FamilyId): "see" | "hear" | "recall" | null;` and `export function practiceRoute(device: VerbDeviceState, family: FamilyId): VerbScreen;`
- Wiring to finish: recap `Practice this family` → unit at the first unfinished step; unit `Play a game` → picker with the family; game completions and misses → `recordPicks` (mastery is one number fed by games and Recall); home cards show `bests` and `ranks`; `prefers-reduced-motion` passed into `RoundConfig.reducedMotion`; list mode flag in the log.

- [ ] **Step 1: Write the failing test:**
```js
test("recap practice opens the unit at the first unfinished step", () => {
  const route = practiceRoute({ ...EMPTY_VERB_DEVICE, unitSteps: { "es.present.go-yo": ["see"] } }, "es.present.go-yo");
  assert.deepEqual(route, { screen: "unit", family: "es.present.go-yo" });
  assert.equal(firstUnfinishedStep({ "es.present.go-yo": ["see"] }, "es.present.go-yo"), "hear");
});
```
(export `practiceRoute` and `firstUnfinishedStep` from `PatternUnit.tsx`).
- [ ] **Step 2: Run** — expect failure.
- [ ] **Step 3: Implement** the wiring and doc sections.
- [ ] **Step 4: Run** `node --test tests/verb-ui.test.mjs` — expect pass.
- [ ] **Step 5: E2E** — add `recap → practice → unit → play` round trip, a keyboard-only Bubble run in list mode (`Tab` to the toggle, `Space`, Start, press `1`–`4` until a completion is announced in `[aria-live="polite"]`), and a `@perf` test (skipped unless `VERB_PERF=1`): CDP `Emulation.setCPUThrottlingRate { rate: 4 }`, record `requestAnimationFrame` deltas for 10 s of Bubble and Crush, assert p95 ≤ 33.4 ms. Run `npx playwright test e2e/verb-games.spec.ts --project=setup --project=desktop --project=iphone-pwa` and `VERB_PERF=1 npx playwright test e2e/verb-games.spec.ts --project=setup --project=desktop --grep @perf` — expect pass.
- [ ] **Step 6: Screens** — run the full `@screens` set (home, bubble, crush, recap, board, unit, verb-card); Read all 28 PNGs; compare against the previous captures and the three mockups; any overlap, clipped text, horizontal scroll or color-only encoding is a fail to fix before commit.
- [ ] **Step 7: Commit** `git add src/components/games/verbs e2e/verb-games.spec.ts docs/verb-games.md tests/verb-ui.test.mjs && git commit -m "Verb Games: cross-links, accessibility runs and performance check"`

### Task 26: Full gates

**Files:**
- Create: `.claude/verify/latest.md` (verification table required by the workspace verify gate; not committed unless the repo already tracks `.claude/verify/`)

- [ ] **Step 1: Types** — `npx tsc --noEmit` — expect no output.
- [ ] **Step 2: Unit tests** — `npm test` — expect all pass, including every `tests/verb-*.test.mjs`.
- [ ] **Step 3: Data freshness** — `node scripts/build-verb-patterns.mts --check` — expect exit 0.
- [ ] **Step 4: SQL fixture** — `node scripts/qa/test-verb-games-db.mjs` — expect `ROLLBACK`, no errors.
- [ ] **Step 5: Lint** — `npm run lint` — expect 0 errors.
- [ ] **Step 6: Full build** — `node scripts/with-supabase-public-env.mjs npm run build` — expect success and `.vercel/output/` written; confirm `es.json` is a separate lazy chunk (`grep -l '"es.present.go-yo"' .vercel/output/static/assets/*.js` lists one non-entry chunk).
- [ ] **Step 7: E2E smoke** — `npm run smoke:e2e -- --phone` — expect exit 0 with `verb-games.spec.ts` in both projects.
- [ ] **Step 8: Visual record** — write `.claude/verify/latest.md` with rows Layout / Colors / Typography / Mobile (375px) / Animations, each citing what the Task 25 PNGs and e2e runs showed; all PASS.
- [ ] **Step 9: Commit** any gate fixes: `git add -A src tests e2e scripts docs supabase && git commit -m "Verb Games Phase 1: gate fixes"` (skip when clean). Do not push or apply the migration; report to the owner that the migration, the `VERB_PUBLIC_BOARDS` flag and the review sign-off are theirs.

---

## Decisions this plan takes (differences from the PRD text)

- The server entry is `src/routes/api.verb-score.ts`, not `src/fns/verb-score.functions.ts`: in this repo bearer-authenticated writes use `api.*.ts` routes with `teamAdminClient` + `authenticatedUser` + `prepareTeamJson` (`api.module-request.ts`), while `src/fns/*.functions.ts` are `createServerFn` AI generators guarded by origin checks.
- The round log stores inputs only (`pick` with frame + piece, `swap` with cells, timestamps). The server derives frames, correctness and escapes, so a client cannot hide a miss.
- Bubble Pop pieces are whole forms; Crush pieces are stem and ending tiles. The frame reads `yo ___ · I come · venir` with the family label beside it.
- Send to Flashcards writes to the Verb Cards deck through a new `ADD_VERB_CARDS` action. `addCard()` forces `category: "vocab"`, so it cannot make `conjugated` cards. `FlashcardEntry` gains an optional `verbKey`, because the form alone is ambiguous: `siento` belongs to both sentar and sentir.
- Handles and reports have no client policies at all. Everything goes through the service-role API, which is stricter than the PRD's own-row select. Pending handles are excluded from boards (the RPC rule).
- The core list is `KNOWN_VERBS` (100 Spanish rows) filtered to verbs with a profile, 72 verified, plus classified verbs once the report is signed.
- A stale-data round is acknowledged and dropped (`status: "stale"`). It is not judged.
