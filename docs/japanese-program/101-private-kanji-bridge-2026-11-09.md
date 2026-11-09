# Japanese 101 private kana-to-kanji bridge

The current Japanese 101 source is mainly kana. Its Foundation 8, Core 10/11/18/21, and Master 15/20 focus notes introduce a few kanji, but the learner dialogue does not yet provide a structured kana-to-kanji progression. The private `content/japanese-basics/private-kanji-bridge-ja-en.json` adds 15 source-linked term readings in those seven lessons without changing any existing lesson text, audio, module ID, or progress key.

Each entry keeps the exact source kana and English meaning, adds segmented ruby text and a context note, and pins its stage source SHA-256. Master 15's `いってください` is `行ってください` (“please go”), while Master 20's same kana is `言ってください` (“please say”); the separate source meanings determine the written form. The bridge also distinguishes `十分` read `じゅっぷん` for ten minutes in Core 10 from other possible readings of that spelling.

Run `python3 scripts/build-japanese101-kanji-bridge.py --check` and `node --test tests/japanese101-kanji-bridge.test.mjs` after source edits. The bridge remains `registered:false` and `reviewed:false`. Qualified Japanese review, a complete script sequence, learner UI/phone fit, and native audio acceptance remain open. It is a supplemental review candidate, not a completed kanji course.
