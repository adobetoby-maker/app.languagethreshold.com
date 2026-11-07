# French 101 Core 1–6 private fixture

This cumulative private fixture extends Core 1–3 through lessons 4–6 under the stable `french-basics` ID and `french-basics:1`–`:6` lesson keys. It is not registered in the live `CURRICULA`, does not write learner progress and does not modify Spanish or Japanese course files or identities. The target/native pair is French/English.

Both authored draft batches pin their English extractions and the original Spanish source files by SHA-256. The generator checks those hashes, then retains all 84 target/native card pairs, 36 exact aligned Reader pairs, 39 dialogue lines, term dictionary entries, checks, grammar and speaking briefs. Each lesson has eight terms and six phrases, so every card fits the Core word limits; all cards are selected and the backlog is empty. The six mode inputs are See, Recall, Hear, Type, Say and Write. Hear and Say contain scripts only, with no recorded audio.

Run `python3 scripts/build-french-101-core-private-pilot-1-6.py` and `node --test tests/french-101-private-core-pilot-1-3.test.mjs tests/french-101-private-core-pilot-1-6.test.mjs`. The cumulative test checks exact source hashes and pair preservation, Core per-lesson word rules, private registration state and unchanged Spanish/Japanese IDs. Full Core 30 validation is not claimed from six lessons.

This remains `reviewed:false`, `registered:false` and without offline or audio acceptance. Independent French language/curriculum review and qualified human review are outstanding. The Spanish-source lines that refer to studying Spanish and broad one-word glosses still need editorial review before any learner-facing registration.
