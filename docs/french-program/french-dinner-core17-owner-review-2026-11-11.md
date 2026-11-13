# French Dinner Core 17 owner-review checkpoint

Core 17 extends the owner-only French→English Dinner preview to Foundation 10 + Core 17 = 27 drafts. Stable ID `travel-dinner:17:fr-en` and the previous 26 IDs are unchanged. The English plan and passage retain the source pins in `core-17-draft.json`.

This lesson asks about the restaurant's dress code: what “smart casual” means there, whether a jacket is required, and whether shorts and sandals are accepted. The eight Reader turns exactly follow the eight source English lines. The receptionist says almost all guests wear a collared shirt and long pants, a jacket is not required, and shorts and sandals are accepted on the terrace but not in the dining room. The guest decides on long pants and closed-toe shoes. The draft has 18 cards, five French form records, six distinct mode prompts and a speaking scene.

Claude CLI Haiku 5.5 authored a candidate; Opus 5.5 reviewed it read-only. The self-check replaced an untranslated English “smart casual” with `tenue chic décontractée`, changed home-style `salle à manger` to restaurant `en salle`, changed `sur la terrasse` to `en terrasse`, and corrected question register and narrator attribution. French usage of `chic décontracté` and restaurant-domain statements still need qualified review. AI critique is not human approval.

`verify-private-core-1-17.py` checks exact source hashes, plan and Reader English strings, stage-local IDs, lesson structure, source facts and closed gates. The owner-only route excludes internal notes. The lesson remains `reviewed:false`, `registered:false`, `readyForLearner:false`, `audio:none`; learner catalog, playback and progress remain unchanged.

The exact-text private audio delta subtracts prior Dinner scopes and pins 26 new strings, 52 fr-FR Aoede/Charon MP3 clips and 2,220 submitted characters. All 52 clips were synthesized privately using quota project `project-91661021-fb2d-4524-b9f` and pass exact text, voice, SHA-256, byte count, duration and decoded-signal verification with zero flags. One clip's 1.082-second leading silence was trimmed by 0.25 seconds, and its hash, byte count and duration were updated before re-verification. The [private listening sheet](/Users/drive/lt-audio/french-travel-dinner/core-17/listening-review.html) needs distinct decisions. Clips remain unbundled and `listeningReviewed:false`.

Core 18–30 and Master 1–20, qualified French/domain review, exact-pair runtime/offline/dictionary integration, audio listening, browser/phone and independent V4 acceptance remain open.
