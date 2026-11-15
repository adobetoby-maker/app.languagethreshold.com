# Japanese Lunch Master 13–20 — source-pinned review bundle

This bundle is **review evidence only** for the exact Japanese:English pair. It is not registered in the learner course, owner pages, audio, scoring, or progress runtime. All eight stable IDs remain `master-travel-lunch:N:ja-en`; every review, registration, audio, learner-readiness, and progress gate in `index.json` is false. The existing `master-13-15-draft.json`, `master-16-18-draft.json`, and `master-19-20-draft.json` remain older source-divergent drafts and must not be treated as replacements or approved lessons.

`master-N-candidate.json` contains the source-reconciled Japanese cards and Reader. `master-N-derived.json` contains a separate proposed forms, speaking, and word-bank layer. Master 15 has a separate six-mode file and a competing seven-form enrichment proposal; neither proposal is selected. `integration-evidence.json` records the November 15 comparison against the pinned Spanish source and old drafts. `index.json` is a normalized convenience view for review; `build-review-index.py` regenerates it from the checked-in packets and validates the source byte hashes and exact English card/Reader positions.

Run `python3 content/japanese-travel-lunch/review/master-13-20/build-review-index.py --check` from any directory after editing these files. The pinned Spanish hashes are `bce5c0799e9d8d038450599ab839a7d48d6f69533968c94f1d3f2ae3808f4bfa` for `src/data/core60/es/master-travel-lunch.json` and `602b0a9b0c29ae6942275ad44734c36267364af6ebe5685e48dabe5da7f94539` for `public/lesson-content/es/master-travel-lunch.json`.

## Decisions still needed

- **Master 13:** Confirm Mexican clinic/pharmacy wording, manager reference, and clinical terminology. The old owner draft shares only one card and zero Reader lines at the same positions.
- **Master 14:** Review Quito llapingachos, the peanut-allergy near miss, and epinephrine wording. The old draft has zero cards and Reader lines at the same positions.
- **Master 15 — conflict evidence:** Costa Rica's source says call **911**, while the old Japanese draft says **119**. The checked-in five-form and seven-form enrichment proposals compete; select and reconcile one after review. The 5-form proposal appears in the index solely as evidence.
- **Master 16 — conflict evidence:** Source card 20 places a slight fever **that night**, while Reader turn 12 says it began **the next morning**. Both remain present for a source and clinical decision. Review Madrid health-office register.
- **Master 17:** Review Cartagena dishes and the balanced restaurant response. The candidate was deterministically authored after an unusable model output; its provenance does not claim model authorship.
- **Master 18:** Review Arequipa/Puno food and currency terms, the 100-soles deposit, and the Reader-only dish hold request. The old draft's yen content cannot transfer.
- **Master 19:** Review Antigua Guatemala foods, the no-chicken-stock condition, and 600/200-quetzal amounts.
- **Master 20 — conflict evidence:** The Spanish distinguishes `crustáceos` and `mariscos`; the English glosses both as “shellfish,” while Japanese uses `甲殻類` for crustaceans. Resolve cards 6, 9, and 16 and review the suggested 10% tip. The candidate's `sourceCardIndex` is zero-based; the index converts it to a one-based card reference.

## Work before any lesson release

Qualified Japanese and relevant food, locale, and clinical reviewers must resolve the items above and approve the exact cards, Reader, forms, six activity cues/answers, and speaking banks. The current evidence verifies English source parity and card-linked mode faces; it does not approve Japanese or domain facts. The older drafts have different card/Reader counts and positions, so activities, scoring targets, dictionary links, and any saved per-activity progress need an explicit remap before registration. Recalculate recorded audio from settled text, synthesize and technically verify clips, then obtain separate listening approvals; no old exact-text audio or listening decision transfers. The packet has no completed learner registration, playback, scoring, or progress integration. iPhone/Watch V4 and offline acceptance are also unverified.
