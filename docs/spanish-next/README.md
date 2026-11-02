# Spanish follow-on Core 60 courses

Target Spanish, native/support English. Each new course has 10 Foundation, 30 Core and 20 Master lessons. Formal human review remains pending; source and native review flags stay false.

| ID | Course | Focus |
| --- | --- | --- |
| spanish-102 | Spanish 102 | Continue Spanish 101: past narration, objects, plans, commands and introductory clause/mood choices |
| spanish-frequent-verbs | Frequent Verbs | Sixty adult spoken-corpus verbs, meanings, complements and regional cautions |
| spanish-conjugation-patterns | Conjugation Patterns | 28 teaching families across 60 lessons, exactly ten distinct verbs and ten checked forms each |
| spanish-usage-verbs | Usage-First Verbs | New scenes for the first 60 verbs in descending Spanish Web 2011 lemma frequency; global ranks stay 1–60 across stage boundaries |
| spanish-common-patterns | Common Grammar Patterns | Sixty constructions including tener que, hay que, ir a, acabar de, clauses and comparisons; three focused checks per lesson |

Spanish 101 and existing learner identities are preserved. The website sequence links all six general courses. Independent Xcode V4 imports these five courses while preserving its earlier sixteen. This is source/resource integration, not a TestFlight upload.

## Sources and reproducibility

Authoring is in `content/spanish-next/`: original bilingual scenes, exact check masks, explicit verb families and exception rules. `sources.json` records primary sources and corpus limitations. Ranks describe a source sample, not an invariant worldwide ordering.

```
python3 scripts/build-spanish-next.py
python3 content/spanish-next/test_conjugation.py
node scripts/build-library-packs.mjs
node scripts/build-curriculum-word-index.mts
node --test tests/spanish-next-courses.test.mjs
```

The compiled course and practice JSON feeds curriculum, exact-pair teaching, inline reading, full Reader, authored cards, grammar checks and speaking missions. Conjugation uses a focused model table and one rotating form per verb in all six practice modes. Its separate ten-verb reference guide remains explicitly present tense; command and compound-tense models never overwrite the present reference schema.

## Audio

`generate-spanish-next-audio.py --dry-run` counts required strings without contacting a provider. Generation uses existing application-default credentials, bounded retries and deterministic filenames. Its cache is outside the repository so ongoing recording cannot refresh learners' pages or browser tests. `publish-spanish-next-audio.py` requires both genders for every current string and validates every MP3 duration before publishing the public files, compiled lookup index, and merged V4 iPhone/Watch resources.

Prior recordings and prior course mappings remain intact. Protected device-only exam audio and live personal conversation keep their existing playback routes. Selected regional/gender voices are respected; the other recorded gender is never substituted.

The native resources include recorded audio for offline playback. No new website download-pack registration or offline-audio claim is made. Online AI conversation and cloud handwriting recognition retain their existing network requirements.

## Review status

Automated validation covers every lesson's counts, aligned translations, exact Reader and mission identities, exact language pair, focused checks, 28 pattern families, ten distinct verbs per conjugation lesson and source frequency order. Explicit gold-form tests cover spelling changes, irregular stems and compound forms. Automated structural and audio-file checks do not constitute independent human language or listening signoff.

The source audit is available as `scripts/audit-course-source.mjs`, adapted from the module skill helper. It validates the published contextual vocabulary rather than substituting the separate ten-verb drill cards into passage-coverage checks. The focused cards have their own model/count checks in `tests/spanish-next-courses.test.mjs`.
