# Japanese Breakfast & Cafés: private runtime-input checkpoint

Exact pair: **Japanese target / English support**. Source: the private F10/C30/M1–9 checkpoint in draft PR #403, which preserves the source-pinned drafts from PRs #363–404. This note describes inspection inputs, not released lessons. The public language-coverage ledger still reports zero validated Japanese Breakfast lessons.

| Stage | Private lessons | Card placements | Aligned Reader lines | Speaking inputs | Six-mode prompt inputs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Foundation | 10 | 120 | 89 | 10 | 60 |
| Core | 30 | 402 | 281 | 30 | 180 |

`src/lib/private-japanese-travel-breakfast-readiness.ts` accepts only those two stage bundles with the exact `Japanese:English` pair, their pinned English-source hashes, stable `:ja-en` lesson IDs and complete input shapes. It gives each private card and cache namespace a stage-and-pair-qualified identity. A different target/support pair returns no input. Corrupt source hashes, duplicate or Spanish lesson IDs, crossed card/Reader text, or incomplete modes fail closed. The one explicitly shared Japanese/English spelling, `Wi-Fi`, remains allowed for Core 26; broad equal-text pairs are rejected. Its release function always returns `null` because `JAPANESE_TRAVEL_BREAKFAST_RELEASED` is `false`. No public route, Core registry, service worker, offline pack, progress writer or native app imports the adapter.

The separate private dictionary inventory holds 522 card placements and 404 exact pairs; 11 Japanese headwords have multiple English glosses, two pairs conflict on term/phrase classification, and all 404 still lack reviewed part of speech and inflection. This adapter does not register those senses. Master has only nine of twenty private source drafts and is outside this Foundation/Core inspection checkpoint.

Validation: cumulative Foundation/Core/Master source-hash, pair, stable-ID, Reader, speaking and six-mode draft validator; private dictionary generator check and two focused unit tests; four exact-pair/negative-cache readiness tests; TypeScript typecheck. The six-mode strings remain authoring inputs, not tested learner exercises. Qualified Japanese and café/food-safety review, full mode implementation, dictionary/Reader/deck ownership, signed-in phone/offline behavior and recorded audio remain open. All source and dictionary `reviewed` and `registered` flags stay `false`; existing learner progress is untouched.
