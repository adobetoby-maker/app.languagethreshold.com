# Japanese 101 voiced-hiragana writing draft

The existing ten basic hiragana writing groups keep their IDs, order, and 46 characters. Five new groups follow them in the writing pad: G (`がぎぐげご`), Z (`ざじずぜぞ`), D (`だぢづでど`), B (`ばびぶべぼ`), and P (`ぱぴぷぺぽ`). Each has character tracing and two contextual word-writing prompts. The interface explains dakuten (゛) or handakuten (゜) for the selected group; the full group name is also the button's accessible label. This extends script practice without adding or renumbering a Core 60 lesson or changing learner progress keys.

All ten word placements are exact Japanese 101 card pairs: `がくせい`/student, `みぎ`/right, `みず`/water, `じかん`/time, `ともだち`/friend, `でんしゃ`/train, `ことば`/word, `べんきょう`/study, `きっぷ`/ticket, and `えんぴつ`/pencil. The focused tests compare each practice word and meaning with the authored Japanese→English lesson files and confirm the original 46-character sequence remains unchanged. `npx tsc --noEmit` and `python3 scripts/build-japanese-basics.py --check` pass.

This remains a draft script supplement. A qualified Japanese reviewer should assess the row sequence, romaji conventions, handwriting difficulty, and the less-common `ぢ`/`づ` forms. The current native V4 experience has not been updated or tested for this practice. No audio or review status was changed.
