# French 101 draft

Exact pair: French target, English support. Stable intended course IDs: `foundation-french-basics`, `french-basics` (Core), and `master-french-basics`. This directory contains **authored draft Foundation lessons 1–10 and Core lessons 1–15**. Spanish 101 English objectives and learning progression are the architecture source; the French words, grammar and dialogue are original. The source file and bounded-subset SHA-256 values are recorded in each Foundation draft JSON and checked by `scripts/validate-french-basics-draft.py`. Core 1–3 pins both the source curriculum and the aligned English Reader meanings in `source-english-core-1-3.json`; `scripts/validate-french-basics-core-draft.py` verifies the hashes and every English pair. Core 4–6 follows the same source contract in `source-english-core-4-6.json`; `scripts/validate-french-basics-core-4-6-draft.py` checks its 42 card pairs and 18 Reader meanings.

The source uses structured `words` with French target text (`fr`), English meaning (`en`), `kind`, and article/number metadata where appropriate; speaker-labeled, aligned French/English dialogue; a specific speaking scenario; checks with separate `audioText`; and `fr-FR` locale. Recorded audio is not present. The Spanish `sourceObjectiveEnglish` field is provenance only and must never appear in learner UI. Learner-facing `objective` is French-specific.

Status: Foundation is AI-reviewed draft. Core 1–3 is a **Haiku-authored draft awaiting independent Fable and Opus review**; Core 4–15 is a Codex-authored bounded draft also awaiting those independent reviews. All have `reviewed:false`. There is no qualified human French review, runtime or offline registration, generated Reader/cards/dictionary/audio, or learner progress migration. Core 16–30 and Master 1–20 are absent here. Do not count the course as released.

See the four `ai-review-foundation-*-2026-11-07.md` files for independent AI reviews, corrections and residual limits. Foundation 7–10 used Haiku drafting, Fable fidelity review and Opus curriculum/grammar review; final narrow AI reviews passed, followed by minor editorial edits noted in the ledgers.

A read-only exact-pair audit on this checkout reports `Unknown base module: french-basics`, confirming the draft has not been registered in the app catalog or runtime. This is expected for this bounded authoring batch.

Core 1–3 keeps the English source's 42 word/phrase meanings and 18 Reader sentence meanings exactly. The source describes Spanish verb classes and has two lines about studying or writing in Spanish, so the French draft teaches French verb patterns while retaining *espagnol* in those two translated lines. English source glosses such as “in / on / at” are broad and cannot be represented by a single French preposition in every context. Independent language review must check the individual French choices and the lesson progression before this draft can be registered.

Core 13–15 keeps all English source meanings in pinned provenance. Core 15 localizes one learner-facing “in Spanish” source line to “in French”; its original meaning remains in source metadata. Core 14 marks two source glosses that both become French *les* for one learner card. See `core-13-15-draft-evidence.md`.

Core 22–24 adds a source-pinned authored draft for comparisons and French direct/indirect-object pronouns. It remains unregistered and unreviewed. See `core-22-24-draft-evidence.md`; run `python3 scripts/validate-french-basics-core-22-24-draft.py`.

Core 25–27 adds a source-pinned authored draft for French direct objects and completed past forms. It remains unregistered and unreviewed. See `core-25-27-draft-evidence.md`; run `python3 scripts/validate-french-basics-core-25-27-draft.py`.
