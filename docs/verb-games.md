# Verb Games

Spanish present-tense pattern games. All verb content (forms, English, families, reasons) comes from the committed file `src/data/verb-patterns/es.json`. There is no runtime AI.

## Verb review sign-off

Verbs that have a dictionary profile are `verified`. Verbs that only appear in lessons or the core list have no profile; the compiler classifies them from their forms and marks them `classified`. A `classified` verb ships only when the review report is signed.

1. Read `docs/verb-patterns/es-review-report.md`. It lists every classified verb with its five forms and family tags, every excluded verb with the reason, profile and lesson conflicts, and gloss variants.
2. Write the sign-off into `docs/verb-patterns/es-review-signoff.json` as `{"reportSha256": "<sha256 of the report file text>", "signedBy": "<name>", "signedAt": "<ISO date>"}`. The hash is the `reportSha256` field in `src/data/verb-patterns/es.json` (also the SHA-256 of the report markdown).
3. Run `node scripts/build-verb-patterns.mts`. With a matching hash, `signedOff` becomes true and classified verbs are included in `es.json`.

The sign-off file stays `null` until a reviewer signs. Any change to the report text changes the hash, so a sign-off no longer matches and the classified verbs drop out again until the new report is signed.

Size note (F24): `es.json` is written as compact `JSON.stringify` with no indent. The 600 KB bound applies to the unsigned file (311,744 bytes, 230 verbs, after Task 4b). TODO for the signed state: a trial compile with a matching sign-off gives 568 verbs and 665,942 bytes, which is over 600 KB. Re-measure after the real sign-off and decide whether to trim fields, split the file, or raise the bound; record the final signed size here.

## Data quality gates (Task 4b)

The compiler does not trust any single source. For every verb, verified or classified:

- Form/tag gate (`formIssues` in `src/lib/verb-games/classify.ts`). Every form must either carry a family tag or be rebuilt exactly by a standard irregular rule (`explainIrregular`: yo `-zco`, `c→z`, `g→j`, `gu→g`; `-uir` `y`; `-iar`/`-uar` written accent; a short exact-form table for ser, estar, ir, haber, dar, saber, ver, caber, oír, oler, mecer, reunir, sonreír). The verb must also be consistent: tú, él and ellos share one class (same stem change, accent, `y`, or regular) and yo follows it unless it has a yo-only rule (-go, -zc and the spelling shifts). Any failure excludes the verb as `form/tag mismatch <person>: <form>`. Untagged irregular forms ship with `families: []`, so they appear in tables and cards but never become a family question.
- Stem changes are matched through spelling shifts before -o (seguir sigo, corregir corrijo, torcer tuerzo all tag as stem changes); a bare shift (vencer venzo, dirigir dirijo) is not a stem change. The -go family needs an -er/-ir verb (oír oigo, caer caigo).
- Profile vs lesson. When a dictionary profile and the lessons disagree for a person, the lesson form wins if every lesson module agrees and only it passes the gate; the profile wins if only it passes; otherwise the verb is excluded as `profile-conflict unresolved`. The report's profile-conflict section says which side won.
- Gloss. `english` is the full chosen lesson gloss with its qualifiers ("to take (time)"). The pick is the most frequent lesson native; ties go to the variant whose first sense appears in the most variants, then the longer one, then code-unit order. Per-form English uses only the first sense.
- Frames. A lesson sentence is dropped when its English reads as a command: after an optional vocative ("Marcos, ...") and a leading adverb ("First ..."), the first word is the verb's own head verb ("Drink water all day." for beber), or "please", "don't", "let's", "do not". The next module's example is tried instead.

## Overrides

`docs/verb-patterns/es-overrides.json` holds reviewed corrections the data cannot express. The compiler applies them over every other source, and the review report prints them in its `## overrides` section, so the sign-off hash covers them. Sections (all optional, keys are infinitives):

| Section | Value | Effect |
|---|---|---|
| `gloss` | display gloss | replaces `english`; per-form English uses its first sense |
| `formEnglish` | `{ person: English }` | replaces the per-form English for those persons |
| `exclude` | reason | verb never ships; report shows `override: <reason>` |
| `dropFrames` | `[person, ...]` | those persons never get a sentence frame |
| `forms` | `{ person: form }` | replaces the profile form and every lesson form for that person (still gated) |

An unknown section, person or infinitive fails the build, so a stale override cannot pass silently.

## Regenerating data

- `node scripts/build-verb-patterns.mts` rewrites `src/data/verb-patterns/es.json` and `docs/verb-patterns/es-review-report.md` from `public/lesson-content/es/*.json`, the dictionary `verbProfiles`, the Spanish rows of `KNOWN_VERBS`, `src/data/verb-patterns/crush-levels.json`, the overrides file and the sign-off file.
- `node scripts/build-verb-patterns.mts --check` exits 1 with `verb patterns are stale` when a fresh compile differs from the committed files. Run it before committing any change to lesson content, profiles, the core list, the compiler or the sign-off.
- `node --test tests/verb-patterns.test.mjs` asserts the committed files equal a fresh compile and checks the dataset-wide rules.
