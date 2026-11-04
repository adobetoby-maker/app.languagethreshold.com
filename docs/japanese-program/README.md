# Japanese→English module program

The [source audit](coverage.json) records 56 catalog-compatible base tracks. Japanese 101 is the sole 10/30/20 mapped draft; 55 tracks still lack a mapped 60-lesson course. Of those, 38 have some authored material and 17 have none. Source presence is not language review, release approval, production availability, or a native V4 installation.

Work through one specialty at a time. Construction Foreman is a reasonable first candidate because its Japanese Core already has 30 vocabulary lists and 30 speaking cards, but its readings, full stages and exact-pair checks are incomplete. Keep stable module IDs and existing Spanish progress. For each exact Japanese→English track, author its own 10 Foundation, 30 Core and 20 Master lessons with aligned English, grammar, lesson-specific reading, cards, six modes, Reader handoff and speaking. Do not fill gaps by translating a Spanish glossary mechanically or by silently falling back to Spanish. Keep `reviewed: false` until a qualified Japanese and domain reviewer actually signs off.

Refresh the compact coverage ledger after each course:

```sh
node /Users/drive/.codex/skills/add-language-threshold-module/scripts/audit-module.mjs --repo /absolute/app/checkout --all --target Japanese --native English --output /tmp/japanese-audit.json
node scripts/qa/compact-japanese-audit.mjs /tmp/japanese-audit.json docs/japanese-program/coverage.json
```

The [audio inventory](audio-inventory.json) currently finds 678 distinct Japanese display strings across the Japanese 101 draft, requiring 1,356 female/male clips and 13,528 spoken characters if all are synthesized. These are **requirements**, not recordings. `python3 scripts/audit-japanese-audio.py --output docs/japanese-program/audio-inventory.json --check` detects stale inventory. The script strips beginner word-segmentation spaces only for proposed speech text; playback lookup must retain the exact normalized display text. Proposed voices are `ja-JP-Chirp3-HD-Aoede` and `ja-JP-Chirp3-HD-Charon`, listed in [Google's supported voices](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types). Do not generate the full batch until text is reviewed; otherwise revisions create wasted recordings and may teach errors. Audio publication needs exact voice/locale keys, valid MP3 durations and hashes, listening review, and a bounded Watch pack.

The owner selected Claude Opus or Fable for independent language review. [Foundation AI review](ai-review-2026-11-04.md) records the first pass and source corrections. This is AI review, not human review; the `reviewed` flags remain false. Core and Master still need their own content passes, followed by full browser/audio acceptance. AI review alone does not prove that a course is ready for release.

The independent V4 project is `/Users/drive/git-backups/LanguageThresholdV4`. Its current native lesson catalog and practice screens assume Spanish. Japanese currently opens the website inside V4; copying Japanese JSON into `Resources/core60.json` would produce incorrect labels, recognition, answer checking, mission IDs and audio lookup. Build and test per-course target-language metadata and Japanese-specific answer/voice paths before importing a Japanese course. V4 is separate from V3; preserve the independent V4 app, Watch bundle IDs, recordings and progress. Archive/TestFlight only after simulator tests, bounded Watch size, accurate release notes and V4 identity checks. The owner will evaluate real iPhone/Watch audio.

Each web course may be merged to main when its own Japanese/domain review and browser acceptance pass. The structural audit, generator tests and preview are necessary but do not substitute for those checks. Japanese 101 remains draft PR #108 on Language Core Builder PR #107; neither is evidence that the course has been released.
