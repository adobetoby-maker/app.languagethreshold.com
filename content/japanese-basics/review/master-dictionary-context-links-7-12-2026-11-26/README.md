# Japanese 101 dictionary-context proposals 7–12

Baseline main: `d843c20fe1b47940e746815fac4bf3df2ec27ddb` (#846). This source-only sidecar addresses the next six scoped face gaps, all from private Master 14 routine source. Existing source/card/dictionary/teaching values are untouched.

| Source face | Exact global sense reference | Existing private card support |
| --- | --- | --- |
| まず — first | `ja-en-c7e785d741ea3eaf` | term or containing phrase row |
| それから — then | `ja-en-c24ce926e407d2a0` | term or containing phrase row |
| さいごに — finally | `ja-en-4015977d882e7d61` | new inert Reader-face projection |
| あさごはん — breakfast | `ja-en-a232a8fc2f946462` | term or containing phrase row |
| しごと — work | unregistered lexical-context candidate only | term or containing phrase row |
| でんしゃ — train | `ja-en-f7593825b016f4e3` | term or containing phrase row |

The five existing exact global sense IDs stay unchanged. それから also has a separate existing after-that row; both records are preserved, while this exact then face references the then ID. No merge, new dictionary registration or ownership selection occurs. しごと has no exact kana/仕事 row in the pinned JapaneseWordData array, so its work-noun explanation is an unregistered candidate, not a claim that no dictionary anywhere contains the headword. It adds no office, employer or location fact.

Reader examples and full kana/English explanations distinguish first/then/final steps, breakfast as the morning meal, work as a noun, and the train as the delayed subject. さいごに is not restricted to past tense; the tense belongs to the narrative. Three literal term-to-form links point to two unique existing canonical form IDs. No form IDs are invented.

Source card coverage is explicit: five entries have existing private term or containing-phrase rows. さいごに has neither, so one inert exact extension 4 phrase-card projection is supplied with a review-only ID and null saved-card ID. The train term also links to the already-proposed M14 six-mode source-face card; that candidate is not counted as a registered card. All card/source row values remain unchanged.

All six contexts retain the private-routine/main-delayed-meeting source hold. These additions yield 12 source-only context proposals, leaving 14 unproposed scoped faces. All 26 scoped links remain unregistered and all proposals unselected/unreviewed. This is not course release or global dictionary completion.

Actual safe-mode Haiku 5.5 authoring, Opus 5.5 read-only critique, Fable 5.2 correction and source-grounded self-check are recorded. No model assistance is qualified review. No runtime, owner page, recording, offline, saved-card or progress changes.

Run `python3 validate.py` with immutable objects available. It verifies six exact faces/Reader examples, existing sense IDs, card/form links, the inert phrase projection, seven unique review IDs, no overlap with earlier proposals, remaining-14 arithmetic and actual metadata. Twelve prior/source files must remain byte-exact.
