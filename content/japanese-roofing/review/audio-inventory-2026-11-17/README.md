# Japanese Roofing archived-draft audio inventory

This read-only inventory counts the Japanese→English Roofing **source-only review archive** on main: 10 Foundation, 30 Core and 20 Master drafts. It does not turn the archive into a reviewed learner course or recording script. The auditor confirms all 62 pinned source-file references still match the current main files, the 60 stable lesson IDs are distinct, and all review and registration gates in the archived bundles remain false. These mechanical checks do not establish Japanese, roofing/safety or dictionary accuracy.

Run `python3 content/japanese-roofing/review/audio-inventory-2026-11-17/audit.py --check` from the repository root. The script recounts every archived card and Reader face, bundle hash, pinned source hash and mode structure against [inventory.json](inventory.json). Optional private evidence can be checked with `--legacy-manifest /absolute/path/to/manifest.json --signal-screen /absolute/path/to/signal-screen.json`. It does not write to the repository, play audio or expose private file paths in the committed report.

| Archived draft scope | Count |
| --- | ---: |
| Lessons | Foundation 10 / Core 30 / Master 20 |
| Card positions | 120 + 440 + 423 = 983 |
| Reader positions | 71 + 251 + 325 = 647 |
| Selected / null Japanese faces | 1,630 / 0 |
| Distinct exact Japanese strings | 1,380 |
| Potential distinct-text two-voice clips | 2,760 |
| Position-specific two-voice listening decisions | 3,260 |
| Distinct text characters per voice / both requests | 24,808 / 49,616 |
| Six-mode labels without authored prompt/target pairs | 360 / 360 |

At the **historical** $30 per million submitted characters, two separate voice requests for each distinct archived string would be about **$1.48848 gross**, before source corrections, provider price/quota changes or any eligible technical reuse. Verify current pricing and quota project `project-91661021-fb2d-4524-b9f` before a paid batch. This is a planning estimate, not a provider invoice.

The private manifest has 1,589 strings / 3,178 Aoede and Charon clips; **zero** clips are marked `listeningReviewed:true` or registered. All 1,380 archived strings match a private manifest string exactly, while 209 legacy manifest strings fall outside the archived card/Reader scope. Exact text overlap is only a technical candidate: source meaning, lesson/row identity, saved-item progress, voice, file hash, bytes, duration, signal and listening must each be checked before reuse. A decoded-signal screen flagged four files. The screen was generated against a manifest before a source-inventory metadata correction; the auditor verified that its complete clip map is identical to the current manifest before carrying over its signal counts. No clip is approved for registration.

All 60 lessons have six named mode cues, but every cue is text-only and lacks an authored prompt/target pair. Qualified Japanese and roofing/safety review, contextual dictionary senses, forms, speaking, exact-pair Reader/cards/mode/saved-item alignment, offline/browser and independent V4 iPhone/Watch acceptance remain open. No synthesis, owner page, runtime, scoring, progress, offline or audio registration is in this batch.
