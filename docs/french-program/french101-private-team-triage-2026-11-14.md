# French 101 private lesson-team triage — 2026-11-14

This is an editorial and source-fidelity checkpoint for owner review, not qualified French approval. The owner-only French 101 route currently contains Foundation 10 and Core 1–21. Core 22–30 and Master 1–20 remain private; no learner registration, progress write or audio gate changed.

Three per-lesson teams used direct Claude CLI safe-mode Haiku 5.5 authoring, Opus 5.5 read-only critique and Fable 5.2 correction, followed by source-grounded self-check. An independent aggregate check inspected all 60 saved CLI responses: each reported `is_error:false` and actual `modelUsage` `claude-haiku-5-5`, `claude-opus-5-5` or `claude-fable-5-2` for its assigned role. The private packets and detailed per-lesson checkpoints are archived locally at `/Users/drive/lt-review/french101-lesson-teams-2026-11-14/`, with `SHA256SUMS`. AI editorial passes do not count as owner, native-speaker or domain approval.

## Master 1–20

Every source-aligned private packet preserves the current Spanish Master lesson's 20 English card strings and 12 English Reader strings in order: **400/400 cards and 240/240 Reader turns**. This is a draft text comparison, not full lesson acceptance. The original Spanish source files are `src/data/core60/es/master-spanish-basics.json` (SHA-256 `27084a65c51ef96ab6b74dd969de1c4b38cd670be1c4b148e2b66f4d9bb15ede`) and `src/data/spanish-basics-practice.json` (SHA-256 `04760ebadb52a4bf08fb87b670bb68169e9c90ca343ad5fc9a1c945eb1c331fe`). The separate #430 redesign packets have 0/400 and 0/240 exact overlap with those sources; see the [source-parity audit](french101-master-source-parity-audit-2026-11-14.md).

The private candidate schemas still differ. Master 1 has gate flags in sidecars; Master 5 lacks a self-contained stable key, card kinds and gate fields and is explicitly blocked for owner projection; Master 9 and 18 place key/gates in wrappers; Master 15 uses `closedGates:true` rather than explicit false registration fields. Ten candidates omit card `kind`, so that parity cannot be independently asserted from those candidate objects. Normalize and validate each complete packet before any owner-route projection. Master 1's Spanish-vowel objective and beginner introduction scene, and Master 5's ungrounded source reconciliation, need source/progression decisions before projection. The original source places basic tasks under Master labels in several more lessons; do not silently substitute the redesigned curriculum.

Qualified dictionary and teaching review must resolve recurring non-equivalences: Spanish masculine-plural `los` does not restrict French `les` to masculine; Spanish `ser/estar` distinctions collapse to French `être`; grouped `in/on/at` requires contextual French prepositions. Master 15 also needs a locale decision for “second floor.” Gendered past participles, one-to-many answer keys and Master-level prerequisites need lesson-specific review. No Master packet has approved exact-text audio or exact-pair web/native runtime acceptance.

## Core 22–30

The current owner route renders only French and English card faces and drops explanatory notes. An independent face audit of the corrected private candidates found:

| Lessons | Owner-preview disposition | Visible issue |
| --- | --- | --- |
| 23, 24, 27, 28 | Block normal cards | French `les` would be paired with the pinned Spanish-only “masculine plural” gloss. |
| 22, 29 | Hold or flag inline | Duplicate `est` faces split identity from condition/location without showing that French uses one form. |
| 30 | Block normal cards and Reader | `est` has the same restrictive gloss; `Ana l’invite` does not explicitly say Ana pays for Luis, while pinned English says she treats him. |
| 25, 26 | Conditional owner-only candidates | No proven false visible face in this audit; grouped answers, gender/tense and grading still need qualified review. |

A source-fidelity owner surface could show a pinned Spanish English gloss separately from a truthful proposed French gloss, label the exact conflict, and suppress normal card, answer, audio and dictionary use. The current side-by-side preview does not do that. Keep the flagged lessons private until the preview can represent the conflict accurately; do not make a false equivalence visible as a normal lesson card. All nine candidates remain `reviewed:false` with learner/audio/progress gates closed. The detailed private Core 22–30 QA and Core 23 independent checkpoint are in the local archive.
