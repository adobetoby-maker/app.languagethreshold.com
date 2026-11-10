# French and Japanese specialty audio pilots

The owner accepted the sound of every French and Japanese pilot recording. The pinned acceptance ledger covers 12 manifests and 120 clips. French 101 and Japanese 101 Foundation 1 pilots are already deployed; this change adds the remaining 10 specialty pilot manifests and 100 MP3 files as static assets under `public/audio/approved-specialty-pilots/`.

Each source manifest and clip matches its accepted SHA-256 digest, exact text, locale, Aoede/Charon voice, byte count, and positive duration. `tests/approved-specialty-pilot-audio.test.mjs` verifies the committed copy. This is audio asset publication only: `textReviewed:false`, no specialty course runtime registration, no lesson or learner-progress change, and no claim of qualified language/domain review. The courses remain draft until their separate release gates pass.
