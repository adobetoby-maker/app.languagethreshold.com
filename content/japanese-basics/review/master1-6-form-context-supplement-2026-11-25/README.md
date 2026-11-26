# Japanese101 Master 1–6 additive form explanations

Baseline main: `70b5496c5eb4a3188829b86d24c476831c6bc497` (#834). This sidecar supplies the first six specifically indexed contextual explanation gaps from the full20 checkpoint. It replaces no canonical form or previous teaching value.

| Master | Stable source form ID | Added contextual explanation |
| --- | --- | --- |
| 1 | `form-ja-en-ced31b8f9f51e450` | invitation-mashou |
| 2 | `form-ja-en-e78a2d27747f1786` | need-question |
| 3 | `form-ja-en-5910a2eddbfc6c9c` | three-bound-books |
| 4 | `form-ja-en-7353b29f27e4965b` | person-location-imasu |
| 5 | `form-ja-en-143d6e2f97b9bf3d` | negative-imasen |
| 6 | `form-ja-en-92e160269b3b9633` | time-mashou |

Each entry has a full kana grammar explanation, English explanation, exact canonical bilingual example, exact adjacent source turns and a concrete practice role/prompt. The source contexts distinguish invitation from past study, need-いる from existence-いる, three notebooks from three people, Ken’s location from identity/condition, no-one from an empty-object claim, and a three-o’clock proposal without adding a time period.

The six explanations extend the source-only contextual total from 60 to 66 of 83 canonical forms. Seventeen additional explanations remain, enumerated by their exact original IDs in context-explanations.json. This is proposal coverage, not qualified review, answer selection or course release. The pinned checkpoint remains an honest earlier snapshot with 23 gaps; this sidecar records the 6 additions without rewriting it.

No variant, target answer, prior mission/cue, lesson source, owner page, runtime, recording, offline or progress value changes. All selections/audio are null and gates false. Safe-mode Haiku 5.5 authoring, Opus 5.5 read-only critique, Fable 5.2 correction and source-grounded self-check have actual metadata; none is qualified Japanese/source/dictionary approval.

Run `python3 validate.py` with the immutable main/private git objects available. It verifies the six canonical IDs/faces, full kana, contextual source anchors, six unique supplemental IDs, all closed gates and actual model metadata. It also compares all seven pinned prior/source files byte-for-byte with current workspace files.
