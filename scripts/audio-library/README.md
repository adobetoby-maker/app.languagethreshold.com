# Reusing existing audio

Set LT_NATIVE_SOURCE to the native V4 checkout. LT_AUDIO_LIBRARY optionally overrides the shared library directory; LT_MEDICAL_AUDIO_CACHE overrides the resumable medical batch directory.

Run import_native_recordings.py to validate and index native V3/V4 assets without altering source apps. Then run sync_shared_hd_audio.py --web /website/checkout --junior /junior/checkout to backfill exact text matches and update the tally. --watch refreshes local source exports while medical generation continues; it does not deploy or commit changes.

The inventory retains text, exact voice/model/accent metadata, source, duration, file hash and bytes. Native Gemini audio stays distinct from Chirp. The generator checks completed Chirp assets before making paid synthesis requests. No provider credentials are stored by these tools. Older original-model-unverified files remain labeled as such. Run generate_medical_hd_audio.py only when synthesis is authorized; importing and syncing do not synthesize.
