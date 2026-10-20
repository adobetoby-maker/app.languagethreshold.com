# Core 60 stages: data architecture and generator contract

> Built by TAC

Every trade's Core 60 is three modules with their own lesson numbers: a free **Foundation**
(`foundation-<base>`, 10 lessons), the **Core 30** (`<base>`), and a **Master** (`master-<base>`,
20 lessons). Roofing's Foundation and Master are hand-written TypeScript
(`src/data/foundation-roofing-curriculum.ts`, `src/data/master-roofing-curriculum.ts`) and stay that
way. Every other trade's stages are **data**: one JSON file per stage plus one manifest line.

## Files

| Path | What | Written by |
|---|---|---|
| `src/data/core60/manifest.ts` | `CORE60_MANIFEST`: one entry per trade that has a stage | generator |
| `src/data/core60/<langCode>/<stage>-<base>.json` | the stage curriculum (format below) | generator |
| `public/lesson-content/<langCode>/<stage>-<base>.json` + `index.json` | passages, words, verbs: same format and loader as every Core 30 module | generator |
| `src/lib/core60-stage-core.ts` | types, file → `ModuleCurriculum`, `deriveStageModule` | – |
| `src/lib/core60-validate.ts` | `validateStageFile`, `validateManifest` (strict rules) | – |
| `src/data/core60-stages.ts` | registry + lazy loader behind `getCurriculum()` | – |
| `scripts/validate-core60.mts` | CLI: `npm run validate:core60` | – |
| `tests/fixtures/core60/` | synthetic test trades (never shipped) | – |

`<langCode>` is `languageTag(language)` ("es", "en").

## Stage file format (`version: 1`)

```jsonc
{
  "version": 1,
  "module": "master-electrician",        // "<stage>-<baseModule>"
  "baseModule": "electrician",           // a Core 30 module id
  "stage": "master",                     // "foundation" | "master"
  "language": "Spanish",                 // target language = the manifest entry's language
  "nativeLanguage": "English",
  "headline": "The Electrician Master 20",
  "threshold": "By Lesson 20, you can …",
  "reviewed": false,                     // true only after a native-speaker reviewer signs it
  "model": "…", "generatedAt": "…",      // optional provenance
  "lessons": [
    {
      "n": 1,                            // 1..10 (Foundation) or 1..20 (Master), in order
      "title": "…",                      // ≤ 70 characters
      "objective": "…",
      "focus": "…",                      // Foundation: required (the Reader step listens for it)
                                         // Master: optional, defaults to grammar.focus
      "words": [ { "es": "target text", "en": "native text", "kind": "term" | "phrase", "note": "…" } ],
      "speaking": "…",                   // the Say it mission brief (Speak step)
      "grammar": { "focus": "…", "examples": [ { "es": "…", "en": "…" }, { "es": "…", "en": "…" } ] },
      "lessonType": "Teach-back" | "Case" | "People" | "Document" | "Capstone",
      "block": "A" | "B" | "C" | "D" | "E"   // grammar/lessonType/block: Master only, all required there
    }
  ]
}
```

Word limits come from `contentLimitsFor(moduleId)`: Foundation 8–12 terms and 4–6 phrases (Core 30
limits), Master 12–16 terms and 6–8 phrases. Words are unique per lesson; notes ≤ 160 characters.
Steps are not stored: the app builds Reader / Word Match / Say it steps exactly like roofing
(Foundation 5/5/6 min, Master 12/8/12). `tests/core60-stage-data.test.mjs` proves the format
reproduces both roofing stages byte for byte and that the validator accepts them.

## Manifest

```ts
export const CORE60_MANIFEST: readonly Core60ManifestEntry[] = [
  { base: "electrician", language: "Spanish", foundation: {}, master: {} },
  { base: "plumber", language: "Spanish", foundation: {} },          // Master: "Coming soon"
];
```

Optional per stage: `blurb`, `userRole`, `challengePrompts`, `vocabFocus` (catalog text); optional per
entry: `tradeLabel` (path card name, default the base module's name). Listing a stage is all the
registration there is:

- **MODULES**: `foundation-<base>` / `master-<base>` are derived from the base module and inserted
  right after it: name "<Base name> Foundation" / "<Base name> Master", same emoji and category,
  `languages: [entry.language]`, price 0 / base price, persona = base persona + the patient A1 rule
  (Foundation) or + "B1-B2" and the unannounced-complication rule (Master). Hand-written ids
  (roofing's) are never replaced.
- **Core 60 path**: `core60Paths()` adds a row per entry. An unlisted stage is a "Coming soon" step
  that is not clickable and not a page; the Core 30 banner keeps the coming-soon text until both
  stages exist (`core60PathComplete`).
- **Pace, gates, labels, exams, grammar box, content limits**: keyed by the `foundation-` / `master-`
  prefixes, so derived modules get the 14-day / 70-day plans, the free-with-account Foundation, the
  "Master Lesson N" labels, no entrance/day 45/day 90 exams, and the grammar box.
- **Say it**: `getSpeakingMissions` builds one mission per lesson from `getCurriculum()`, with
  `surpriseComplication` and B1 level for Master lessons.

## Loading (bundle impact)

Stage curricula are **not** in the main bundle. `import.meta.glob("./core60/*/*.json")` makes each
stage file its own lazily imported chunk (content-hashed, cached offline by the service worker).

- `getCurriculum(id)` stays synchronous: `CURRICULA[id] ?? stageCurriculum(id)`. A stage reads as
  null until its chunk has loaded.
- Client: `useStageCurriculum(moduleId)` (`src/hooks/use-stage-curriculum.ts`) starts the load and
  re-renders on arrival. TabShell calls it for the active module (any tab); the Core 60 tab shows
  `core60-stage-loading` and mounts the lesson page and runner only once the curriculum is in.
  The Say it catalog re-reads missions when a stage settles.
- Server: a request middleware in `src/start.ts` awaits `preloadStageCurricula()` once per
  instance, and `/api/speak` awaits it before `findSpeakingMission`, so server code stays sync.
- Plain Node (tests, scripts, the generator): no bundler, so the registry reads the JSON from disk
  on first use; `getCurriculum("master-x")` works without await.

Measured with `node scripts/with-supabase-public-env.mjs npm run build` (empty manifest; the cost
of each stage file is its own chunk, loaded only when opened):

| Client chunk | Before | After | Change |
|---|---|---|---|
| entry `index-*.js` | 1,391,151 B (gzip 431,070) | 1,392,056 B (gzip 431,313) | +0.07% |
| `modules-*.js` (CURRICULA + MODULES) | 852,683 B (gzip 259,296) | 864,098 B (gzip 264,453) | +1.34% |
| all client JS | 9,120,218 B | 9,127,656 B | +0.08% |

## How the generator (T4) writes a trade

1. Write `src/data/core60/<langCode>/foundation-<base>.json` and/or `master-<base>.json` in the
   format above; run `validateStageFile(file, { moduleId, stage, language })` before writing and
   feed any errors back into a retry.
2. Write the passages and verbs to `public/lesson-content/<langCode>/<stage>-<base>.json` and add
   them to `public/lesson-content/index.json` (same format as every Core 30 module; Master content
   uses `MASTER_CONTENT_LIMITS` via `contentLimitsFor`).
3. Add or extend the trade's entry in `src/data/core60/manifest.ts` (keep it sorted by `base`).
4. Run `npm run validate:core60 -- --strict` (manifest ↔ files, every file, lesson content present),
   then `npm test`. Adding a manifest entry must keep the whole suite green: the tests that count
   catalog modules and Say it missions (`tests/speaking-missions.test.mjs`), the fixture tests
   (`tests/core60-fixture.test.mjs`, which validate the fixture manifest only) and the path tests
   (`tests/core60-path.test.mjs`) compute their expectations from `CORE60_MANIFEST`, so they move
   with it; a test that hard-codes today's catalog is a bug to fix, not a reason to skip a trade.

The generator is `scripts/build-core60.mts` (prompts and checks in
`src/lib/core60-generator-core.ts`): `node scripts/build-core60.mts --module <id,...>` writes steps
1 to 3 for each stage and publishes a stage only when its curriculum and all of its passages pass;
`--dry-run` prints the token and dollar estimate for every remaining module. Its extra checks on top
of `validateStageFile`: terms and phrases unique across the stage, Master titles that do not repeat
the Core 30, the fixed block / lesson-type arc (Lesson 20 the Capstone), Say it briefs that never
reveal the complication, and, per passage, every term's head word as a whole word plus attributed
doses and specifications. The format has no safety field: the Master outline's per-lesson
`safetySensitive` flag stays in the generator's progress file and run report.

To add a module by hand, follow the same three steps. To take a stage down, remove its manifest
key (the file can stay; the validator flags it as unlisted).

## Validator

```bash
npm run validate:core60                      # shipped manifest + every listed file; unlisted files fail
npm run validate:core60 -- --strict          # also require public/lesson-content for each stage
npm run validate:core60 -- --file <path>     # one file (the generator's pre-write check)
npm run validate:core60 -- --fixture         # tests/fixtures/core60
```

## Fixture

`tests/fixtures/core60/` holds two synthetic trades (`test`: Foundation + Master; `test-partial`:
Master only). Node tests opt in with `CORE60_FIXTURE=1` (`tests/core60-fixture.test.mjs`); the e2e
spec injects it into the dev-server page as `window.__CORE60_FIXTURE__`, which only a dev build
reads (`import.meta.env.DEV`). No fixture byte is in a production build.
