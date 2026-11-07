# Japanese Foreman private audio scope refresh

This read-only estimate is pinned to the private 10 Foundation, 30 Core, and 20 Master inputs stacked through [draft PR #319](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/319). It includes all 20 new original Master Reader scenes. The [machine-readable inventory](foreman-audio-inventory-2026-11-07.json) lists a SHA-256 for every source bundle, a combined source fingerprint, and a normalized Japanese text fingerprint. Rebuild and check with:

```bash
python3 scripts/audit-japanese-foreman-audio.py --output docs/japanese-program/foreman-audio-inventory-2026-11-07.json
python3 scripts/audit-japanese-foreman-audio.py --output docs/japanese-program/foreman-audio-inventory-2026-11-07.json --check
python3 tests/japanese-foreman-audio-audit.test.py
```

The current words and Reader lines contain **1,286 unique displayed Japanese strings** after NFC/whitespace normalization. Both `ja-JP-Chirp3-HD-Aoede` and `ja-JP-Chirp3-HD-Charon` would require **2,572 clips** and **43,344 spoken characters** in total. The [earlier audit in draft PR #293](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/293) counted 1,126 strings, 2,252 clips and 34,600 characters before the original Master Reader was complete. The increase is 160 unique strings, 320 clips and 8,744 characters. This is an estimate of proposed inputs, not a recording manifest or a quality signoff.

At [Google Cloud's listed Chirp 3 HD rate](https://cloud.google.com/text-to-speech/pricing) of US$30 per million characters, the gross illustration is about **US$1.30** if every proposed line is synthesized once with both voices and no free allowance applies. This excludes retries, revisions, grammar and speaking text, taxes, storage and delivery. Google counts all submitted characters; final requests and pricing must be rechecked before paid synthesis.

**All audio remains blocked.** No Foreman recording has been generated, no line has qualified Japanese listening approval, and the private course remains unregistered with `reviewed:false`. The new Master Reader scenes lack independent Fable/Opus review and qualified human/domain review. Do not flip any playback gate or start a broad paid batch from this estimate. Resolve the Master 2 concrete/deicing concern and other safety/code claims first, then use a small exact-text pilot. For every proposed clip, preserve its source text and hash, locale, voice identity, file hash, duration and a per-clip reviewer result for pronunciation, pacing and clipping. Retake failed clips and recheck source hashes before importing a bounded pack. V4/Watch packaging and device acceptance are separate steps.
