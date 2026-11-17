# Japanese Breakfast source-packet audio inventory

This is a **read-only planning artifact** for the current Japanese→English Breakfast source packets. It does not include recordings, select answers for disputed rows, authorize synthesis or reuse, or enable playback. The learner exact-pair audit remains catalog-only; all review, audio, progress, offline and V4 gates stay closed.

Run `python3 content/japanese-travel-breakfast/review/audio-inventory-2026-11-17/audit.py` from any directory to recount the 60 repository packets. To reproduce the full [`inventory.json`](inventory.json) comparison on a machine with the private evidence, pass `--legacy-manifest /absolute/path/to/manifest.json --signal-screen /absolute/path/to/signal-screen.json`. The script reads those files and prints JSON; it never writes or contacts a speech service. The snapshot pins SHA-256 for every packet source file and both private evidence files. Text equality is exact Unicode string equality, with no normalization, translation or fuzzy match.

| Scope | Count |
| --- | ---: |
| Lessons | 10 Foundation + 30 Core + 20 Master |
| Card/Reader positions | 1,825 |
| Selected draft Japanese faces | 1,821 |
| Withheld faces | 4 (Core 2: three; Core 6: one) |
| Distinct selected Japanese strings, across all stages | 1,635 |
| Potential position-specific two-voice listening decisions | 3,642 |
| Potential distinct-text two-voice recordings after deduplication | 3,270 |
| Distinct-text characters per voice | 36,715 |
| Distinct-text characters for two separate voice requests | 73,430 |

At the **historical** $30 per million submitted characters, synthesizing both voices once per distinct selected text would be about **$2.20290 gross**, before provider price/quota changes and any technically eligible reuse. The 1,821 positions sum to 37,761 Japanese characters per voice without deduplication. These are code-point counts for planning, not a provider invoice. Verify the current rate and quota project `project-91661021-fb2d-4524-b9f` before any paid batch. Earlier single-text character estimates are one-voice baselines when the prospective clip count includes two voices.

The older **private** 60-lesson manifest has 1,180 distinct texts and 2,360 Aoede/Charon clips. Every manifest text, clip listening and registration flag is false. The saved decoded-signal screen covered all 2,360 files and flagged three long-edge-silence recordings; private trimmed candidates still need their own listening decisions. Among the new selected faces, 281 positions representing 168 distinct strings have exact text overlap with that old manifest: 47 Foundation, 180 Core and 54 Master positions. The snapshot includes a lesson-by-lesson overlap count. Overlap is a **technical candidate only**: old lesson/row identity, saved-item progress and listening decisions do not transfer. If all 168 strings passed exact locale/voice/text/file hash/bytes/duration/signal checks and per-clip listening, 1,467 distinct new strings would remain, a theoretical 72,108 two-voice request characters or $2.16324 at the historical rate. No overlap is currently approved for reuse.

The four withheld rows are listed in `inventory.json` with revision-scoped review IDs and source English. They are excluded from every audio estimate until qualified Japanese/source/food review resolves the three Core 2 coffee/speaker conflicts and Core 6's generic medical-advice line. Any change to an exact Japanese face retires its old text hash and requires a new clip decision. The legacy generator targets the archived draft and must not be run against these packets.

Before a recording could be registered, the exact source face and contextual dictionary sense need qualified review; the final lesson needs authored See, Recall, Hear, Type, Say and Write activities, speaking, Reader/card alignment, saved-item semantics and exact-pair progress behavior. The eventual audio batch then needs a current quota/price check, exact text/locale/voice manifest, technical verification, and a distinct human listening decision for **each** recording. Browser, offline and independent V4 iPhone/Watch acceptance remain separate release gates.
