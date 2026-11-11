# Japanese Lunch private offline text candidates

Three content-addressed, exact `Japanese:English` text-pack candidates are derived from the 60-lesson private runtime candidate. Their sole source SHA-256 is `e3c22c9525d9196067a37146c32ce04d64b9ed6ada9abccdaf34de75b6950355`. The builder checks the current 60-lesson source before producing each stage and refuses changed lesson, card, Reader, speaking, or six-mode input in its verifier.

| Pack ID | Lessons | Cards | Bytes | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `foundation-travel-lunch-ja-en` | 10 | 135 | 65,397 | `7882f7a23d73f022c71f090c8faed4484ab4f9ef1d1ba3bf306a36075ad15c54` |
| `travel-lunch-ja-en` | 30 | 505 | 228,599 | `e51497d53582cb38d608f9d89db8f698ba8b5707daa7eddbbf7fc5f08ca1223d` |
| `master-travel-lunch-ja-en` | 20 | 459 | 234,920 | `41a6e43e96f4a481a65ec326ead20110643be645e19ebd1b95ff8586a3e9ea29` |

The stage-specific cache namespace and prospective progress scope include both language identities and the stage. They are candidate names only: no learner progress writer uses them. All manifests set `releaseEnabled:false`, `workerAllowlistEnabled:false`, `routeCandidate:null`, `appAssetInventory:null`, and `installationStatus:"not-installed"`. The release API returns an empty list. The pack files stay under `content/japanese-travel-lunch/private-offline/`, outside `public/lesson-packs`; public download and worker registries do not name these packs.

Each candidate contains the Japanese/English cards, 760 aligned Reader turns in total, speaking prompts, and six authored activity inputs per lesson. Recorded audio, device voice, online conversation, and learner exercise code are absent. The complete private recorded-audio batch is separately unreviewed and is not included here. Qualified Japanese content/listening and factual review, dictionary decisions, actual offline installation/reload tests, browser/phone checks, and independent V4 acceptance remain open.

Rebuild with `node scripts/build-private-japanese-travel-lunch-offline.mjs`; verify without writing with `--check`. The focused test `node --test tests/japanese-travel-lunch-private-offline.test.mjs` checks all stage counts, exact pair, source/content hashes, card and Reader ownership, changed source and payload failure, and nonregistration. The source builder `python3 content/japanese-travel-lunch/build-private-runtime-candidate.py --check` must also pass. No course or progress key is released by this checkpoint.

# Runtime audio surface check (2026-11-10)

`python3 content/japanese-travel-lunch/verify-private-runtime-audio-coverage.py` compares the pinned private runtime candidate with the recorded audio scope and technical batch evidence. All 60 stable lessons are technically covered by 3,094 two-voice pairs; the check found zero missing placements across 1,099 cards, 760 Reader turns, 120 speaking openings/closures, 1,099 speaking word-bank entries, and 360 mode model answers. It also requires the batch evidence to report zero missing pairs and zero signal flags. This is a repeatable inventory of learner speech surfaces, not a listening or content approval. The full-course batch remains `listeningReviewed:false`, `registered:false`, and unbundled.
