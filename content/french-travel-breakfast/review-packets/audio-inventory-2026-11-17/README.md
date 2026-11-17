# French Breakfast source-packet audio inventory

This is a **read-only planning artifact** for the 60 French→English Breakfast review packets. It does not choose the disputed Core 30 answer, approve any French text or recording, authorize synthesis or reuse, or enable playback. The exact-pair learner audit remains catalog-only; all review, audio, progress, offline and independent V4 gates stay closed.

Run `python3 content/french-travel-breakfast/review-packets/audio-inventory-2026-11-17/audit.py --check` from the repository root to recount the public source packets against [inventory.json](inventory.json). To recheck the private evidence, pass `--legacy-manifest /absolute/path/to/manifest.json --signal-screen /absolute/path/to/signal-screen.json`. The script only reads files and prints a report; private paths and recordings are never committed. The snapshot pins SHA-256 for every selected packet file and both private evidence files. Matching uses exact Unicode text equality.

| Scope | Count |
| --- | ---: |
| Lessons | 10 Foundation + 30 Core + 20 Master |
| Card/Reader positions | 1,825 |
| Draft French faces | 1,824 |
| Withheld face | Core 30 Reader 4 |
| Distinct draft French strings, across all stages | 1,640 |
| Potential position-specific two-voice listening decisions | 3,648 |
| Potential distinct-text two-voice recordings after deduplication | 3,280 |
| Distinct-text characters per voice | 87,394 |
| Distinct-text characters for two separate voice requests | 174,788 |

At the **historical** $30 per million submitted characters, synthesizing both voices once per distinct selected text would be about **$5.24364 gross**, before provider price/quota changes or eligible technical reuse. The 1,824 selected positions sum to 90,034 French characters per voice without deduplication. These are Python code-point counts for planning, not a provider invoice. Verify the current rate and quota project `project-91661021-fb2d-4524-b9f` before a paid batch. Earlier packet character totals mix one-voice and two-voice conventions; use this direct recount for the combined 60-packet scope.

The older **private** manifest has 1,608 distinct French texts and 3,216 Aoede/Charon clips across an older 60-lesson draft. Every manifest text, clip listening and registration flag is false. A saved decoded-signal screen covered all 3,216 files and flagged eight recordings: five with edge silence and three very quiet or with little active signal. Private trim and level candidates are also unreviewed. Among the new selected faces, 877 positions representing 709 distinct strings exactly match older text: 148 Foundation, 588 Core and 141 Master positions. Even exact overlap is a **technical candidate only**: old lesson/row identity, saved-item progress and listening decisions do not transfer. If all 709 strings passed exact locale/voice/text/file hash/bytes/duration/signal checks and a distinct per-clip listening decision, 931 distinct new strings would remain, a theoretical 125,204 two-voice request characters or $3.75612 at the historical rate. None is currently approved for reuse.

The withheld Core 30 Reader 4 is listed in `inventory.json` with its revision-scoped ID and exact source English. It is excluded until qualified French/source/food-allergy review resolves the current children's no-nuts recommendation versus the unmerged cross-contact refusal story and aligns card, Reader and Write IDs. Any changed French face retires its old exact-text audio scope. The legacy generator targets the archived draft and must not be run against these packets.

Before a recording can be registered, the exact source face and contextual dictionary sense need qualified review; the lesson needs authored See, Recall, Hear, Type, Say and Write activities, speaking, Reader/card alignment, saved-item semantics and exact-pair progress behavior. A later audio batch needs current quota/price verification, an exact text/locale/voice manifest, technical verification and a distinct human listening decision for **each** recording. Browser, offline and independent V4 iPhone/Watch acceptance remain separate gates.
