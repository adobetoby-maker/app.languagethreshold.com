# Verb Games

Spanish present-tense pattern games. All verb content (forms, English, families, reasons) comes from the committed file `src/data/verb-patterns/es.json`. There is no runtime AI.

## Verb review sign-off

Verbs that have a dictionary profile are `verified`. Verbs that only appear in lessons or the core list have no profile; the compiler classifies them from their forms and marks them `classified`. A `classified` verb ships only when the review report is signed.

1. Read `docs/verb-patterns/es-review-report.md`. It lists every classified verb with its five forms and family tags, every excluded verb with the reason, profile and lesson conflicts, and gloss variants.
2. Write the sign-off into `docs/verb-patterns/es-review-signoff.json` as `{"reportSha256": "<sha256 of the report file text>", "signedBy": "<name>", "signedAt": "<ISO date>"}`. The hash is the `reportSha256` field in `src/data/verb-patterns/es.json` (also the SHA-256 of the report markdown).
3. Run `node scripts/build-verb-patterns.mts`. With a matching hash, `signedOff` becomes true and classified verbs are included in `es.json`.

The sign-off file stays `null` until a reviewer signs. Any change to the report text changes the hash, so a sign-off no longer matches and the classified verbs drop out again until the new report is signed.

Size note (F24): `es.json` is written as compact `JSON.stringify` with no indent. The 600 KB bound applies to the unsigned file (about 311 KB, 230 verbs). TODO for the signed state: a trial compile with a matching sign-off gives 542 verbs and about 639 KB, which is over 600 KB. Re-measure after the real sign-off and decide whether to trim fields, split the file, or raise the bound; record the final signed size here.

## Regenerating data

- `node scripts/build-verb-patterns.mts` rewrites `src/data/verb-patterns/es.json` and `docs/verb-patterns/es-review-report.md` from `public/lesson-content/es/*.json`, the dictionary `verbProfiles`, the Spanish rows of `KNOWN_VERBS`, `src/data/verb-patterns/crush-levels.json` and the sign-off file.
- `node scripts/build-verb-patterns.mts --check` exits 1 with `verb patterns are stale` when a fresh compile differs from the committed files. Run it before committing any change to lesson content, profiles, the core list, the compiler or the sign-off.
- `node --test tests/verb-patterns.test.mjs` asserts the committed files equal a fresh compile and checks the dataset-wide rules.
