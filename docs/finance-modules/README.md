# Finance courses

Three courses, each authored for Spanish/English and English/Spanish. Each exact pair has **10 Foundation + 30 Core + 20 Master lessons**, for **360 language-specific lessons** in total.

| Course | Spanish target / English support | English target / Spanish support |
| --- | --- | --- |
| Accounting & Financial Services | `accounting` | `accounting-english` |
| Personal Money & Banking | `personal-money` | `personal-money-english` |
| Travel Money & Payments | `travel-money` | `travel-money-english` |

Prefix an ID with `foundation-` or `master-` for its other stages. App links use `/?module=<id>&target=Spanish&native=English&tab=core30` (reverse the target/native values for the English IDs).

## Sources and build

The six arrays under `content/finance/<course>/es-en.json` and `en-es.json` are the authored source. Historical word fields mean **es = target; en = native**, including English-target lessons. `lesson.words` is canonical; the duplicate `content.words` is kept in sync.

Run, in order:

```sh
node scripts/validate-finance-content.mjs
python3 scripts/build-finance-content.py
node scripts/build-library-packs.mjs
node scripts/build-curriculum-word-index.mts
node scripts/build-verb-patterns.mts
python3 scripts/audit-finance-audio.py
node --test tests/finance-modules.test.mjs
node scripts/validate-core60.mts
npx tsc --noEmit
```

Finance practice is loaded one exact-pair course at a time. Public content, stage files, Reader shards and vocabulary indexes are reproducible derived assets. Reader IDs and lesson/mission numbering remain stage-local. Foundation grammar is stored in its practice pack; Foundation stage files retain the existing stage schema.

The browser suite uses synthetic local authentication, intercepted database requests and no live speaking-provider calls. Start the app on port 3485 with its existing public configuration, then run:

```sh
npx playwright test --config playwright.finance.config.ts
```

It covers the first and last lesson of every stage, all six modes, and exact Reader handoff on desktop and an iPhone viewport in Chromium. It is not a Safari-device, microphone, live AI-provider or offline-installation test.

## Review and release status

The user requested one Haiku builder per course, followed by Opus review and Codex review. Real Claude CLI runs, prompts, model receipts, findings and corrections are recorded under `model-team/`. Model review is separate from qualified human review: all human review flags stay **false**.

The courses use the existing six practice modes, lesson speaking cards, authored decks, dictionary/word index and scoped progress system. Custom formal exams, finance-specific illustrations and offline-download packs are separate and have not been produced. New Finance verb examples remain available in each lesson; they are excluded from the global signed Verb Games pool pending its separate review, preserving the existing signed pool. Picture/action practice reuses shared room scenes and course-relevant objects.

HD-only playback reuses verified existing Spanish recordings where an exact match exists and otherwise requests the app's online HD service. It never falls back to device speech for these courses. `content/finance/audio-inventory.json` lists exact reuse and missing female/male clips; it does **not** represent a completed new recording batch. No new bulk synthesis was run.

These are authored drafts for review, not evidence of independently assessed CEFR proficiency. Dates, fees, balances and exchange rates in the original practice scenes are illustrative. Country-specific tax terminology stays labeled. Regional Spanish and specialist financial/tax terminology still need a qualified human pass before describing the content as human reviewed.

`coverage-ledger.json` records exact source coverage, validation and publication state. The outline preview is a curriculum explorer, separate from the working app player.
