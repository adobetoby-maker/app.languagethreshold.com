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
  `surpriseComplication` and B1 level for Master lessons. The mission keeps its stage module id
  (`foundation-<base>`), which lesson practice (`embeddedMissionPrefix`) and `/api/speak` key off.
- **Speak tab catalog**: a stage is not a module card there. `getSpeakingModules` lists base modules
  only, and the catalog groups a stage's missions (lessons and its catalog-override challenges)
  under the base module (`speakingCatalogModuleId`), after the base's own, labelled by stage
  ("Foundation · …", "Master · …": `speakingCatalogTitle`). Roofing's hand-written stages follow
  the same rule. The module cards' mission counts include the stage missions.

## Loading (bundle impact)

Stage curricula are **not** in the main bundle. `import.meta.glob("./core60/*/*.json")` makes each
stage file its own lazily imported chunk (content-hashed, cached offline by the service worker).

- `getCurriculum(id)` stays synchronous: `CURRICULA[id] ?? stageCurriculum(id)`. A stage reads as
  null until its chunk has loaded.
- Client: `useStageCurriculum(moduleId)` (`src/hooks/use-stage-curriculum.ts`) starts the load and
  re-renders on arrival. TabShell calls it for the active module (any tab); the Core 60 tab shows
  `core60-stage-loading` and mounts the lesson page and runner only once the curriculum is in.
  The Say it catalog re-reads missions when a stage settles. A chunk that fails to load (offline,
  a dropped connection) is not remembered as final: the Core 60 tab shows `core60-stage-error`
  ("Couldn't load this stage. Check your connection and try again.") with a `core60-stage-retry`
  button, which calls `retryStageOrReload`: it tries the import again in the page (status back to
  "loading") and, when that fails again, reloads the page. The reload matters: a browser keeps a
  failed dynamic import in the document's module map, so a second `import()` of the same chunk URL
  fails without even making a request; only a fresh page fetches it again (found by the e2e test
  that aborts the chunk once, `e2e/core60-path.spec.ts`, "Core 60 stage load failure").
- Server: nothing is preloaded for every request. A request waits only for the stages it reads
  (`stageLoadPlan` in `src/data/core60-stages.ts`, applied by the middleware in `src/start.ts`):
  `/api/speak` loads just the stage of the requested scenario id (`stageModuleIdOfScenario`, then
  `ensureStageCurriculum`) before `findSpeakingMission`; a server function (lesson words, deck,
  lesson review, ...) loads the stage ids named in its payload; the exam, team and push routes,
  which read module ids from the database, load every listed stage; every other request (pages,
  assets, auth, tutor) waits for nothing. A loaded stage is cached for the life of the instance. A
  failed load is never cached: the next request retries it once `STAGE_RETRY_BACKOFF_MS` (2 s) has
  passed, so one bad fetch cannot leave Say it on a 400 until the instance recycles. When you add
  a server route that reads `getCurriculum()` for a module id, load the stage first
  (`await ensureStageCurriculum(id)`), or add its path to `ALL_STAGES_ROUTE` if the ids come from
  the database. Tests: `tests/core60-stage-loading.test.mjs`.
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

1. Write the passages and verbs to `public/lesson-content/<langCode>/<stage>-<base>.json` (same
   format as every Core 30 module; Master content uses `MASTER_CONTENT_LIMITS` via
   `contentLimitsFor`).
2. Write `src/data/core60/<langCode>/foundation-<base>.json` and/or `master-<base>.json` in the
   format above; run `validateStageFile(file, { moduleId, stage, language })` before writing and
   feed any errors back into a retry. Then add the content file to `public/lesson-content/index.json`.
3. LAST, add or extend the trade's entry in `src/data/core60/manifest.ts` (keep it sorted by
   `base`), with the stage's own `blurb`, `userRole` and `challengePrompts` (Foundation 4-5 A1
   challenges, Master 4-6 B1-B2): without them a stage inherits the Core 30's six challenges and the
   Speak tab shows them three times. The manifest is the registration, so writing it last means a
   crash never leaves the manifest pointing at a missing file; a stage file the manifest does not
   list yet is only a `validate:core60` warning.
4. Run `npm run validate:core60 -- --strict` (manifest ↔ files, every file, lesson content present),
   then `npm test`. Adding a manifest entry must keep the whole suite green: the tests that count
   catalog modules and Say it missions (`tests/speaking-missions.test.mjs`), the fixture tests
   (`tests/core60-fixture.test.mjs`, which validate the fixture manifest only) and the path tests
   (`tests/core60-path.test.mjs`) compute their expectations from `CORE60_MANIFEST`, so they move
   with it; a test that hard-codes today's catalog is a bug to fix, not a reason to skip a trade.

The generator is `scripts/build-core60.mts` (prompts and checks in
`src/lib/core60-generator-core.ts`): `node scripts/build-core60.mts --module <id,...>` writes steps
1 to 3 for each stage and publishes a stage only when its curriculum and all of its passages pass;
`--dry-run` prints the token and dollar estimate for every remaining module (Opus first, then
Sonnet). Its extra checks on top of `validateStageFile`: terms and phrases unique across the stage,
Master titles that do not repeat the Core 30, the fixed block / lesson-type arc (Lesson 20 the
Capstone), Say it briefs and Master challenges that never reveal the complication, the stage's
catalog text (blurb, role, challenges not copied from the Core 30), and, per passage, every term's
head word as a whole word, no sentence that only lists lesson terms (one list of exactly three is
allowed per passage; a second, or four or more, is rejected), and every dose or specification
attributed in the SAME sentence by a whole word (según la orden / la etiqueta / el protocolo /
el fabricante / el código local, per the order ...). `validateStageFile` and
`validateLessonContent` (so the generator, `validate:core60` and the content tests) reject
invisible characters: soft hyphen U+00AD, zero-width U+200B-U+200D, word joiner U+2060, U+FEFF,
control characters, and a non-breaking space inside a word. A Master whose stage-wide check fails
after all five blocks redoes the offending blocks once (each checked against every other block);
if it still fails, those blocks are cleared from the progress file so `--resume` writes them again
instead of looping on a cached bad block. The format has no safety field: the Master outline's
per-lesson `safetySensitive` flag stays in the generator's progress file and run report.

### Providers: the default build is Opus on the Claude subscription

`--provider cli` (the default) runs every call (Foundation and Master curricula, passages and
verbs) through the logged-in Claude Code CLI, `claude -p`, billed to the owner's Claude
subscription through its Keychain OAuth login; `--model` defaults to `claude-opus-5-5` there
(owner decision, 2026-10-20), and `--model sonnet` is an override. `--provider api` is the
Anthropic API with `ANTHROPIC_API_KEY` (tool calls, default Sonnet).

Each cli call: `--output-format json` (the reply is `.structured_output`, else the JSON in
`.result`), `--json-schema` = the API tool's input schema without `minItems` / `maxItems` (counts
are left to the generator's checks, which give precise retry messages), `--tools ""` (no tools),
`--system-prompt` (the same system prompt as the API call, replacing Claude Code's own; only the
"call the tool" sentence changes), `--effort high`, `--safe-mode` (no CLAUDE.md, hooks, skills,
plugins or MCP servers), `--strict-mcp-config`, `--no-session-persistence`,
`--disable-slash-commands`, the user prompt on stdin, from an empty temp directory, with every
`ANTHROPIC_*`, `CLAUDECODE` and `CLAUDE_CODE_*` variable removed from the child's environment (so
the CLI can never bill an API key; its init event reports `apiKeySource: "none"`). A retry is a
fresh call carrying the rejected answer and its errors. Default concurrency 2. A usage limit, rate
limit or overload pauses every call and retries (until the CLI's reset time when it gives one, else
30 s doubling, at most 15 min per wait, up to `--rate-limit-wait-hours`, default 8); a refused
login stops the run (resumable). Every call is logged in the progress file (`calls`) with its
tokens (uncached, cache writes, cache reads, output), turns, duration and the CLI's notional
list-price cost, which a subscription does not bill.

To add a module by hand, follow the same three steps.

### Taking a stage down

Remove that stage's key (`foundation` and/or `master`) from the trade's manifest entry, and the
whole entry when no stage is left. That is the take-down: the stage's catalog module, its path step
(back to "Coming soon"), its Say it missions and its page all go. Do it in this order and check:

1. Edit `src/data/core60/manifest.ts`; `npm run validate:core60 -- --strict` still passes (an
   unlisted file only warns "unlisted").
2. The JSON file under `src/data/core60/<langCode>/` can stay (re-listing it is the way back), but
   it still builds: `import.meta.glob("./core60/*/*.json")` makes a chunk for every file in the
   folder whether or not the manifest lists it, so an unlisted stage ships as an unreferenced chunk
   (nothing loads it) and still costs build output. Delete the file to remove the chunk.
3. Learners who already have progress or a purchase for that stage keep it in their saved profile;
   the module simply stops being offered. The `public/lesson-content/<langCode>/<stage>-<base>.json`
   content file and its `index.json` line can stay; they are plain static files.
4. `npm test` (the catalog and mission counts follow the manifest) and a build.

## Validator

```bash
npm run validate:core60                      # shipped manifest + every listed file; unlisted files warn
npm run validate:core60 -- --strict          # also require public/lesson-content for each stage
npm run validate:core60 -- --file <path>     # one file (the generator's pre-write check)
npm run validate:core60 -- --fixture         # tests/fixtures/core60
```

`validateManifest` also checks each entry's `language`: it must be in the app's language list
(`LANGUAGES`, `src/data/languages.ts`, with a known content-folder tag) and, when the base module
lists its own `languages`, one of those. A base without a list is not a free pass.

## Fixture

`tests/fixtures/core60/` holds two synthetic trades (`test`: Foundation + Master; `test-partial`:
Master only). Node tests opt in with `CORE60_FIXTURE=1` (`tests/core60-fixture.test.mjs`); the e2e
spec injects it into the dev-server page as `window.__CORE60_FIXTURE__`, which only a dev build
reads (`import.meta.env.DEV`). No fixture byte is in a production build.
