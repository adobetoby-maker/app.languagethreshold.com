# Japanese Lunch private offline text candidates

Three content-addressed, exact `Japanese:English` text-pack candidates are derived from the 60-lesson private runtime candidate at SHA-256 `5e7579bcf45d237d1d8acfed6049bacd04f6ad3c66c150fd0a4904804da170d5` and the private dictionary candidate at SHA-256 `e4bddd31a0965548fe1f76b1791ca7150fbf0689e4c3bb88fc663591c930c6e1`. The builder checks both exact sources before producing each stage and refuses changed lesson, card, Reader, speaking, six-mode, or dictionary input in its verifier.

| Pack ID | Lessons | Cards | Dictionary entries | Bytes | SHA-256 |
| --- | ---: | ---: | ---: | ---: | --- |
| `foundation-travel-lunch-ja-en` | 10 | 135 | 130 | 129,679 | `9250716b291fdbb3699807d359b2e66f004e00a41aa8e8476f9147336e13413a` |
| `travel-lunch-ja-en` | 30 | 505 | 418 | 447,633 | `88bb754373af919b3626159cfa4c3dfcdf11cee5647b48eec77792d576c2bb85` |
| `master-travel-lunch-ja-en` | 20 | 459 | 447 | 472,743 | `fbd2c69b5e88198551c3769d8428608a56416b804f2c7d8103c665a9f13f285c` |

The stage-specific cache namespace and prospective progress scope include both language identities and the stage. They are candidate names only: no learner progress writer uses them. All manifests set `releaseEnabled:false`, `workerAllowlistEnabled:false`, `routeCandidate:null`, `appAssetInventory:null`, and `installationStatus:"not-installed"`. The release API returns an empty list. The pack files stay under `content/japanese-travel-lunch/private-offline/`, outside `public/lesson-packs`; public download and worker registries do not name these packs.

Each candidate contains the Japanese/English cards with exact per-card sense IDs, its stage's matching private dictionary entries, 760 aligned Reader turns in total, speaking prompts, and six authored activity inputs per lesson. The runtime builder verifies all 1,099 card references against the 955 distinct dictionary candidates and the 20 pinned lesson-source files. The private content-review sheet now displays each card's sense ID for qualified review. Recorded audio, device voice, online conversation, and learner exercise code are absent. The complete private recorded-audio batch is separately unreviewed and is not included here. Qualified Japanese content/listening and factual review, dictionary decisions, actual offline installation/reload tests, browser/phone checks, and independent V4 acceptance remain open.

Rebuild with `node scripts/build-private-japanese-travel-lunch-offline.mjs`; verify without writing with `--check`. The focused test `node --test tests/japanese-travel-lunch-private-offline.test.mjs` checks all stage counts, exact pair, source/content hashes, card and Reader ownership, changed source and payload failure, and nonregistration. The source builder `python3 content/japanese-travel-lunch/build-private-runtime-candidate.py --check` must also pass. No course or progress key is released by this checkpoint.

# Runtime audio surface check (2026-11-10)

`python3 content/japanese-travel-lunch/verify-private-runtime-audio-coverage.py` compares the pinned private runtime candidate with the recorded audio scope and technical batch evidence. All 60 stable lessons are technically covered by 3,094 two-voice pairs; the check found zero missing placements across 1,099 cards, 760 Reader turns, 120 speaking openings/closures, 1,099 speaking word-bank entries, and 360 mode model answers. It also requires the batch evidence to report zero missing pairs and zero signal flags. This is a repeatable inventory of learner speech surfaces, not a listening or content approval. The full-course batch remains `listeningReviewed:false`, `registered:false`, and unbundled.
