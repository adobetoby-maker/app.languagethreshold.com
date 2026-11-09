# French 101 private HD audio checkpoint — 2026-11-09

This checkpoint uses the unregistered French→English draft fixtures in this PR stack. It creates no runtime registration, lesson approval, or learner progress change. The owner accepted the earlier Foundation 1 pilot separately; the new recordings below still require listening review.

## Foundation

The exact `private-runtime-foundation-1-10.json` fixture has SHA-256 `6eca43a19dc9ed6090eef417d58be728e90ff91a26798555c14422b59f5261d3`. All 10 lessons have 744 per-lesson `fr-FR` Chirp 3 HD MP3s across Aoede and Charon: 372 per-lesson display strings, 296 distinct display strings, 592 distinct display/voice pairs, 11,126 spoken characters, and 4,681,536 bytes. Each source display string is pinned alongside its spoken string. Reader character labels remain visible in the display; only the nine explicitly enumerated Foundation speaker labels are removed from speech. Source text, voice, locale, SHA-256, byte count, duration, and private/review state passed the full-stage verifier.

The files and listening index are private at `/Users/drive/lt-audio/french-101/foundation-listening-review-2026-11-09.html`. All new manifests say `listeningReviewed:false`, `registered:false`, and each new clip says `listeningReviewed:false`. The accepted pilot manifest at `/Users/drive/lt-audio/french-101/foundation-1/manifest.json` was not modified. The full Lesson 1 set is stored separately in `foundation-1-complete`.

The paid generation ceiling was 744 clips and 11,126 characters on Google quota project `workerbee-494003`, at an estimated $0.334 using the verified $0.00003/character rate. The generator defaults to a dry run and requires an explicit project and `--generate`, with at most 20 new clips per call.

## Core

The exact `private-runtime-core-1-30.json` fixture has SHA-256 `6d200aae866bbd1561e9bc9b035a516641b555592561bb51168bbecae9f74af5`. All 30 lessons have 836 per-lesson `fr-FR` Aoede/Charon MP3s: 418 per-lesson display strings, 252 distinct display strings, 504 distinct display/voice pairs, 14,800 spoken characters, and 5,630,976 bytes. Exact text, voice, locale, hash, byte count, duration, and private/review state passed the full-stage verifier. The private listening index is `/Users/drive/lt-audio/french-101/core-listening-review-2026-11-09.html`; all new clips remain `listeningReviewed:false` and unregistered. The preflight estimated $0.444 for this stage at the same rate.

## Master and whole-course coverage

The exact `private-runtime-master-1-20.json` fixture has SHA-256 `233429fbd437e2633c50678588f8b0da2a100a19604502f5d3177d9c10450061`. All 20 lessons have 800 per-lesson `fr-FR` Aoede/Charon MP3s: 400 per-lesson display strings, 391 distinct display strings, 782 distinct display/voice pairs, 32,880 spoken characters, and 8,903,616 bytes. Dialogue speaker labels are retained in the displayed source and removed from speech using an explicit label list. The `Courriel` email heading remains spoken content. An unknown label fails generation. Exact text, voice, locale, hash, byte count, duration, and private/review state passed the full-stage verifier. The private listening index is `/Users/drive/lt-audio/french-101/master-listening-review-2026-11-09.html`; all new clips remain `listeningReviewed:false` and unregistered. The preflight estimated $0.986 for this stage at the same rate.

Across the 60 lessons, the private course has 2,380 per-lesson clips, 919 distinct display strings across stages, 58,806 spoken characters, and 19,216,128 MP3 bytes. The combined report is `/Users/drive/lt-audio/french-101/course-coverage-2026-11-09.json`. All 60 listening sheets and all 2,380 local audio links resolve. These are structural/audio-file checks, not a listening or French-language approval.

## Remaining gates

Human listening of new clips, qualified French lesson review, dictionary sense curation, full six-mode/runtime/offline wiring, browser/phone/native acceptance, and release checks remain open. The private course stays `reviewed:false` and unregistered.
