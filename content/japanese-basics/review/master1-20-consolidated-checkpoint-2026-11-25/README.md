# Japanese 101 Master 1–20 source-only checkpoint

Pinned main: `5670ac77a145e34a879f6a2bd2c1dc706b706d22` (#833). Immutable private #488: `018e69872875ae15acc7381368bac199bf61171e`. This deterministic manifest links existing review files; no teaching packet is rewritten or selected.

All 20 numbered Master lessons have source-only contextual alternatives. This means 114 literal contextual mode pairs (113 distinct target faces within lessons), 60 new form explanations of 83 canonical forms, 20 speaking alternatives and 194 unique review IDs. It does not mean a completed or released course. Master 14 has 3 context slots and a speaking alternative, not 6 new mode activities. Master 8 See/Write intentionally share source turn 4. There are 0 selected alternatives and 0 audio-eligible alternatives.

Master 9, 14 and 15 each have 5 canonical forms; the other 17 lessons have 4. The 23 forms below lack an additional contextual explanation in these bounded repair packets. Every listed canonical form, answer, variant list and stable ID remains intact in private source; “missing” does not mean an absent canonical form.

| Master | Source turn | Stable form ID | Remaining explanation focus |
| --- | ---: | --- | --- |
| 1 | 10 | `form-ja-en-ced31b8f9f51e450` | invitation-mashou |
| 2 | 3 | `form-ja-en-e78a2d27747f1786` | need-question |
| 3 | 2 | `form-ja-en-5910a2eddbfc6c9c` | three-bound-books |
| 4 | 3 | `form-ja-en-7353b29f27e4965b` | person-location-imasu |
| 5 | 6 | `form-ja-en-143d6e2f97b9bf3d` | negative-imasen |
| 6 | 2 | `form-ja-en-92e160269b3b9633` | time-mashou |
| 7 | 5 | `form-ja-en-e13606b681d9b07b` | method-question |
| 8 | 6 | `form-ja-en-04dd860abf3d2072` | scheduled-yotei |
| 9 | 7 | `form-ja-en-af49b7640046db38` | which-of-two |
| 9 | 8 | `form-ja-en-d69c290bfb155d04` | choice-object-wo |
| 10 | 7 | `form-ja-en-46864a7ec11a727f` | quoted-possession |
| 11 | 8 | `form-ja-en-4787d0c2d4b98010` | two-item-order |
| 12 | 7 | `form-ja-en-3939c16219f828c4` | suggestion-mashou |
| 13 | 8 | `form-ja-en-d8353f66960339c3` | completed-dekimashita |
| 14 | 1 | `form-ja-en-235062d82bb143af` | usual-routine-fudan |
| 14 | 10 | `form-ja-en-b281e81e401f273f` | delay-result-state |
| 15 | 1 | `form-ja-en-d9ec2b2084d69cd0` | direction-te-kudasai |
| 15 | 2 | `form-ja-en-3a7955b04999ff66` | turn-te-kudasai |
| 16 | 1 | `form-ja-en-6f95085b04f8bce6` | now-yondeimasu |
| 17 | 4 | `form-ja-en-ca0eab39786ae1cf` | permission-show |
| 18 | 9 | `form-ja-en-1b5dab5a83ba3805` | past-location-answer |
| 19 | 4 | `form-ja-en-55d03bd59910a777` | past-progressive-reason |
| 20 | 5 | `form-ja-en-d48db665e363298d` | quoted-word-check |

The manifest supplies exact source Japanese/English faces and immutable form-file pins for each gap, so a next authoring batch can target these 23 existing IDs without regenerating valid forms or inventing variants.

The existing main Reader matches main source in 20/20 lessons. It matches private #488 source in 19/20. Master 14 main remains the delayed-meeting lesson with 13 Reader faces, while private uses the routine redesign with 18. Across Master this is 248 main versus 253 private faces. This is a different lesson source, not simply five appended lines; forms/Reader/cards/modes/dictionary/progress adoption must be reviewed atomically. The existing Reader adapter reads main practice data, not these alternatives.

Private six-mode cues are present for 20 lessons. The source-only repairs preserve their original anchors for Master 1–13 and 18–20. Master 15–17 propose 14 different anchors across 18 activities, each a verified literal dialogue/extension face, while original canonical source remains unchanged. These proposals are explicitly unselected. Master 14 has no six-mode repair in this set. Parallel English Hear choices are present in 16 of 19 repaired Hear activities; Master 15–17 use Japanese sentence identification with prompts asking for a line, so absence of English choices there is a schema difference, not an asserted translation defect.

Main runtime support has no private `modes` field; its adapter derives stage-based teaching settings (Master uses stage 30) from the older speaking context. The existing generic runtime partner roles differ from the private authored missions. The verified private builder and preview copy the learner task into partnerRole in 20/20 private support records; the alternatives propose explicit counterparts. No runtime import or actual browser/native adoption is established by this manifest.

Main curriculum exposes 360 word/card rows across Master, without explicit per-row IDs in that JSON. This does not prove saved-card instability: actual saved-item identity belongs to its owning adapter and must be checked before migration. The manifest lists 26 private term faces without an exact Japanese/English match at the same scoped dictionary lesson link. Those terms may exist elsewhere or be inherited; this audit does not mark 26 global dictionary entries missing or create duplicates. Qualified sense/context ownership remains open.

No private Master Reader face literally matches the pinned Foundation pilot audio registry. This is a check of that registry only, not an exhaustive claim that no private audio assets exist. Old listening decisions cover exact recordings only. Full per-script scope, cost estimate, source/locale/voice/hash/duration checks, distinct listening decisions, runtime/offline/browser/phone and independent V 4 acceptance remain.

Next useful work: author the 23 specific explanation gaps in bounded source-only batches; resolve Master 14 source adoption and six-mode repair; then evaluate exact-pair cards/Reader/forms/speaking/dictionary/saved progress as one atomic selection. Qualified Japanese/source/dictionary review remains separate. All current selections/audio fields are null and gates false.

Run `python3 validate.py` with the pinned main/private git objects available. It rebuilds and compares the manifest, verifies 27 immutable pins, exact source/form mappings, normalized schema variants, IDs and closed gates. `--write` regenerates only this manifest. No new model call or qualified approval occurred in this deterministic consolidation.
