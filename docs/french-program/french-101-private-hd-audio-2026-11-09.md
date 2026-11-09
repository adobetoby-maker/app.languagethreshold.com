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

## Signal screen

On November 9, the exact-text verifier passed all 60 private lesson manifests again. `scripts/audit-french101-audio-signal.py` then decoded all 2,380 lesson-file occurrences (2,132 unique file hashes) and flagged 49 files for focused listening: 30 Foundation, 16 Core, and 3 Master. Forty-three were very quiet, 45 had little active signal, and three had long leading or trailing silence; a file can have multiple flags. Most quiet flags are short words. The [private report](/Users/drive/lt-audio/french-101/signal-audit-2026-11-09.json) pins the manifest set at SHA-256 `693f59fe4ea8694f33f297dabbacc3fb496ca33f2d5575d043d88a5e1c4fd198`. All 49 audio links in the [focused listening sheet](/Users/drive/lt-audio/french-101/signal-review-2026-11-09.html) resolve.

The three edge-silence priorities are Core 27 `son / sa / ses` (Aoede), Master 3 `Merci. Je lui donnerai aussi un crayon.` (Charon), and Master 15 `Pouvez-vous me redire le trajet avant de partir ?` (Charon). An automated flag is a listening priority, not a judgment about pronunciation or an approval decision. The owner's earlier pilot acceptance remains recorded separately. No recording, manifest review flag, playback route, or learner progress was changed by this screen.

Six of the quietest clips received separate private retake candidates, totaling 18 spoken characters. The [comparison sheet](/Users/drive/lt-audio/french-101/signal-retakes-2026-11-09/review.html) has 12 resolving links, one original and one candidate for each word. Retakes for `et` (Charon), `oui` (Charon), and `en` (Aoede) returned byte-identical MP3s; another blind retry is unlikely to help. The `c’est` (Charon) candidate has a much stronger measured signal, while `ans` (Aoede) and `est` (Charon) remain quiet. The candidate [manifest](/Users/drive/lt-audio/french-101/signal-retakes-2026-11-09/manifest.json) pins every original and new SHA-256, voice, exact spoken text, duration, and signal metrics. All candidates are `listeningReviewed:false` and unregistered. No original recording or lesson manifest was replaced; selection awaits listening review.

For the five retakes still below a 0.05 peak, `scripts/level-french101-quiet-retakes.py` created reversible, level-adjusted MP3 candidates without another paid synthesis call. The [three-way comparison sheet](/Users/drive/lt-audio/french-101/signal-level-candidates-2026-11-09/review.html) has 15 resolving links: original, retake, and level candidate for each word. New peaks are 0.39–0.41, with source audio and gain pinned in the [private manifest](/Users/drive/lt-audio/french-101/signal-level-candidates-2026-11-09/manifest.json). Level adjustment can amplify noise as well as speech, so these are listening candidates only; none replaces a source MP3 or changes `listeningReviewed:false`.

## Remaining gates

Human listening of new clips, qualified French lesson review, dictionary sense curation, full six-mode/runtime/offline wiring, browser/phone/native acceptance, and release checks remain open. The private course stays `reviewed:false` and unregistered.
