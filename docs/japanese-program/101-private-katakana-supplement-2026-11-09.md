# Japanese 101 private katakana supplement

`content/japanese-basics/private-katakana-supplement-ja-en.json` adds five supplemental units with all 46 basic katakana signs, matched one-to-one to their hiragana readings. Each sign has a read prompt and a write prompt. The units cite exact Japanese→English term pairs from Foundation, Core, and Master: `ノート`, `けしゴム`, `アメリカ`, `ドア`, `ペン`, `メニュー`, and `グループ`. Source file SHA-256 values and stage-local lesson keys keep those examples tied to the existing course.

This is script-specific supplemental content, not five additional numbered Core 60 lessons. Voiced signs, small katakana, and the long-vowel mark appear in source examples but still need their own authored contrast practice. The prompts are data only: no learner UI, scoring, recorded audio, offline pack, or progress key is installed. Qualified Japanese review must assess the examples, visual confusables, sequencing, and phone/native presentation. `registered:false` and `reviewed:false` remain true.

Run `python3 scripts/build-japanese101-katakana-supplement.py --check` and `node --test tests/japanese101-katakana-supplement.test.mjs` after Japanese 101 source edits.
