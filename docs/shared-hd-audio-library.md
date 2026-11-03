# Shared Spanish HD audio library

The reusable library lives at `/Volumes/Drive 2/language-threshold-audio-library`.

- `inventory.sqlite` and `inventory.json`: validated text/voice identities, locale, provider, file SHA256, bytes, duration and origin.
- `clips/`: reusable MP3s; hardlinks where the filesystem supports them.
- `manifest.json`: normalized text to female/male recording lookup, with exact HD voice identities.
- `tally.json`: current unique text, voice-clip and file counts, generation progress and local export destinations. Counts are not human listening approval or live deployment evidence.
- `legacy-inventory.json`: older recordings retained separately without inventing HD voice provenance.

Reuse requires NFC text normalization, meaningful accents retained, exact voice and locale. A different voice, accent or changed text must not reuse the same key. SHA256 protects file integrity. The medical generator checks this inventory before making a paid request on future runs. The currently running batch also resumes from its own completed clips.

`python3 scripts/sync_shared_hd_audio.py --web CHECKOUT --junior CHECKOUT` validates new completed clips with ffprobe and updates both apps' audio manifests. `--watch` refreshes every five minutes until the medical batch has been installed in V4. It never generates audio or deploys applications.

The main website reuses its existing recorded Spanish playback resolver. Junior receives only exact matches from its authored Spanish vocabulary and stories; no adult medical modules or medical text catalog is introduced. Its reader queue and flashcards prefer reusable HD audio for Latin American Spanish. Existing device speech remains for unmatched Junior text and other languages; V4 iPhone has its own recording-only policy. No Spanish audio is borrowed for another target language or Spain accent.

Build/test evidence for this integration: main website recording contract tests 9/9; Junior playback lifecycle tests 4/4, TypeScript and production build pass. Both website source exports await publication; ongoing generated clips are not automatically live.
