# French 101 draft

Exact pair: French target, English support. Stable intended course IDs: `foundation-french-basics`, `french-basics` (Core), and `master-french-basics`. This directory contains **authored draft Foundation lessons 1–10 only**. Spanish 101 English objectives and learning progression are the architecture source; the French words, grammar and dialogue are original. The source file and bounded-subset SHA-256 values are recorded in each Foundation draft JSON and checked by `scripts/validate-french-basics-draft.py`.

The source uses structured `words` with French target text (`fr`), English meaning (`en`), `kind`, and article/number metadata where appropriate; speaker-labeled, aligned French/English dialogue; a specific speaking scenario; checks with separate `audioText`; and `fr-FR` locale. Recorded audio is not present. The Spanish `sourceObjectiveEnglish` field is provenance only and must never appear in learner UI. Learner-facing `objective` is French-specific.

Status: AI-reviewed draft, `reviewed:false`, no qualified human French review, no runtime or offline registration, no generated Reader/cards/dictionary/audio, and no learner progress migration. Core 1–30 and Master 1–20 are absent here. Do not count the course as released.

See the four `ai-review-foundation-*-2026-11-07.md` files for independent AI reviews, corrections and residual limits. Foundation 7–10 used Haiku drafting, Fable fidelity review and Opus curriculum/grammar review; final narrow AI reviews passed, followed by minor editorial edits noted in the ledgers.

A read-only exact-pair audit on this checkout reports `Unknown base module: french-basics`, confirming the draft has not been registered in the app catalog or runtime. This is expected for this bounded authoring batch.
