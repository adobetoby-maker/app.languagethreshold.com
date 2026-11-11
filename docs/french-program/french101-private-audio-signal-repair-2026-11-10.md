# French 101 private signal repair options

The current private full-course signal audit covers 2,570 voice occurrences and 2,314 unique decoded files. It flags 50 audio hashes. Those hashes appear in **69 lesson placements** and represent **51 exact spoken-text/voice identities**. One near-silent MP3 hash is attached to both `il` and `ans` with Charon; a hash-only replacement would assign one word's pronunciation to the other. The repair builder therefore groups affected placements by hash **and** exact text, voice, and locale.

The [private manifest](/Users/drive/lt-audio/french-101/signal-repair-options-2026-11-10/manifest.json) (SHA-256 `3ccb60ff60a6b6f95e41860430d650a0baeb54f0280dcc48f4b2e2141ac369c3`) identifies **25 signal-passing retakes**, **17 signal-passing same-text/same-voice course recordings**, and **9 unresolved identities**. The [comparison sheet](/Users/drive/lt-audio/french-101/signal-repair-options-2026-11-10/review.html) plays the original and candidate side by side. Every selected file was checked against its manifest byte count, SHA-256, duration, text, voice, locale, and decoded signal. The sheet neither approves pronunciation nor installs a replacement.

The nine unresolved identities reduce to seven unique text/voice requests: Aoede `ans`, `ou`, `oui`; Charon `ans`, `il`, `ou`, `te`. Two `il` and two `oui` source hashes account for the duplicate requests. Existing retakes of these words remain below the signal thresholds, so another blind one-word synthesis batch is not justified. A qualified French listener should assess the selected alternatives in context and decide how to record the seven unresolved pronunciations. Short written forms can have context-dependent pronunciation; exact written text alone does not approve a clip.

Rebuild and verify without paid synthesis:

```sh
python3 scripts/build-french101-signal-repair-candidates.py \
  --audio-root /Users/drive/lt-audio/french-101 \
  --signal-report /Users/drive/lt-audio/french-101/signal-audit-current-2026-11-10.json \
  --retake-manifest /Users/drive/lt-audio/french-101/signal-retakes-all-2026-11-09/manifest.json \
  --output /Users/drive/lt-audio/french-101/signal-repair-options-2026-11-10 --check
```

All full-course manifests remain `listeningReviewed:false` and `registered:false`; no playback, progress, or production files changed. The owner's earlier pilot acceptance covers the distinct pilot clips, not these full-course candidates.
