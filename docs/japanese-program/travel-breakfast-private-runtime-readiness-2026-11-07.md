# Japanese Breakfast & Cafés: private runtime-input checkpoint

Exact pair: **Japanese target / English support**. Source: the private F10/C30/M20 source stack through draft PR #414, plus the gated runtime-input adapter from draft PR #408. This note describes inspection inputs, not released lessons. The public language-coverage ledger still reports zero validated Japanese Breakfast lessons.

| Stage | Private lessons | Card placements | Aligned Reader lines | Speaking inputs | Six-mode prompt inputs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Foundation | 10 | 120 | 89 | 10 | 60 |
| Core | 30 | 402 | 281 | 30 | 180 |
| Master | 20 | 305 | 205 | 20 | 120 |

`src/lib/private-japanese-travel-breakfast-readiness.ts` accepts all three stages with the exact `Japanese:English` pair, pinned English-source hashes, stable `:ja-en` lesson IDs and complete input shapes. Master is assembled only from seven ordered, source-matched private segments covering lessons 1–20; missing, repeated or reordered segments fail closed. The adapter gives each private card and cache namespace a stage-and-pair-qualified identity. A different target/support pair returns no input. Corrupt source hashes, duplicate or Spanish lesson IDs, crossed card/Reader text, or incomplete modes fail closed. The one explicitly shared Japanese/English spelling, `Wi-Fi`, remains allowed for Core 26; broad equal-text pairs are rejected. Its release function always returns `null` because `JAPANESE_TRAVEL_BREAKFAST_RELEASED` is `false`. No public route, Core registry, service worker, offline pack, progress writer or native app imports the adapter.

The separate full-stage private dictionary inventory now holds 833 card placements and 659 exact Japanese–English pairs. Its [review queue](../../content/japanese-travel-breakfast/private-dictionary-full-review-2026-11-07.md) identifies 20 Japanese headwords with multiple English glosses. All 659 pairs still lack reviewed part of speech and inflection. This adapter does not register those senses; contextual review remains open.

Validation: cumulative Foundation/Core/Master source-hash, pair, stable-ID, Reader, speaking and six-mode draft validator; five exact-pair/negative-cache readiness tests including Master segment integrity; TypeScript typecheck. The six-mode strings remain authoring inputs, not tested learner exercises. Qualified Japanese and café/food terminology review, full mode implementation, dictionary/Reader/deck ownership, signed-in phone/offline behavior and recorded audio remain open. All source and dictionary `reviewed` and `registered` flags stay `false`; existing learner progress is untouched.

On 2026-11-08, the required smoke runner completed with the bundled Node 24.19.0 runtime: local `npm run smoke:e2e` reported 101 passed, 22 skipped, 0 failed; production `npm run smoke:e2e -- --prod` reported 19 passed, 0 failed, 0 skipped. Both runs used the same draft checkout. The machine's Node 26.5.0 runtime had previously printed each test result but hung during teardown without a summary; those runs were not counted as passes. The completed smoke checks cover existing public behavior, not a release of these private Japanese lessons.
