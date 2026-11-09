# French 101 Foundation 1 private audio pilot

Five exact French card strings from the unreviewed Foundation 1 source are pinned by source file SHA-256 and aggregate text SHA-256 in `private-audio-pilot-foundation-1.json`. Ten fr-FR Chirp 3 HD MP3s, one each in Aoede and Charon for every string, were generated under the owner's previously used Google Cloud project `workerbee-494003`. The dry run counted 146 characters across both voices, nominally $0.0044 at $0.00003/character; actual billing was not checked.

Files and manifest are private at `/Users/drive/lt-audio/french-101/foundation-1/`. Text, locale, voice, SHA-256, byte count and positive duration were verified. The local `listening-review-2026-11-08.html` sheet presents all ten recordings for qualified French listening and retake notes. Source and listening review flags remain false. These clips are neither registered nor published and do not change learner progress.

`python3 scripts/build-french101-private-audio-pilot.py --check` detects source drift. The generator defaults to dry run and requires the exact aggregate SHA-256, five-text limit and ten-clip cap for an unreviewed paid pilot. Full-course synthesis, language review, web/native integration and owner device acceptance remain open.
