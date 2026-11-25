# Japanese 101 Master 14: unselected answer spelling and reading variants

This source-only packet addresses the explicitly remaining acceptable-answer/reading-map gap in draft #485. It does not claim that the two canonical Japanese sentences contain a grammar error. It preserves all existing lesson text, IDs, canonical form answers, reading order, known-variant lists, kana adapter code, audio and progress behavior.

The source check found that #488 and #485 are still open draft PRs. Exact main `927ce9d8d39aba3c28eba48126e9d5a154ffc898` retains the delayed-meeting Master 14. The private routine redesign at immutable #488 head `018e69872875ae15acc7381368bac199bf61171e` includes さいごに in extension 14, so no missing-finally correction is authored. This packet does not duplicate or promote that redesign.

| Existing private form ID | Main Reader turn | Private routine turn | Canonical meaning | Mixed-script proposal |
|---|---:|---:|---|---|
| `form-ja-en-b281e81e401f273f` | 4 | 10 | But the train is delayed. | でも、電車が遅れています。 |
| `form-ja-en-e2fe935c347bd01c` | 9 | 14 | After that, I arrived at the station. My friend was waiting. | そのあと駅に着きました。友達は待っていました。 |

Both full Japanese/English faces already match main and the private routine source exactly. Each has an additional unspaced-kana proposal and the mixed-script proposal above: four variants total. They preserve the delayed resulting state and past waiting without adding an onset or duration. All alternatives remain `selectedJapanese:null`, `reviewed:false`, with audio null and all acceptance/runtime/scoring/listening/offline/progress/browser/V4 gates false.

The private adapter currently requires every known variant to equal the Reader target. This is a deliberate draft restriction pending acceptable-answer review, not evidence that alternate orthography is linguistically wrong. The mixed-script proposals include explicit Kanji-to-kana mappings back to the unchanged canonical answer. Raw Kanji characters cannot supply Kana Pad reading groups by themselves. Small ゃ in でんしゃ and small っ in まって stay distinct; ordinary う/い does not automatically trigger long-vowel teaching. No new group-selection or answer-normalization policy is selected.

Qualified Japanese review still needs to decide acceptable spelling/spacing/punctuation policies and whether the proposed reading mappings belong in the future form/kana bridge. Any later promotion must preserve exact form/Reader identities, kana-reading provenance, exact-text audio scope and saved-item/progress meaning together. Referencing a private prompt ID here does not adopt it as a new runtime identity.

Explicit safe-mode Haiku 5.5 authoring, Opus 5.5 read-only critique and Fable 5.2 correction have actual usage/session metadata in `ai-assistance-metadata.json`, followed by source-grounded self-check. AI assistance is not qualified approval.

Run `python3 content/japanese-basics/review/master14-form-kana-variants-2026-11-24/validate.py`. It validates the pinned main source, two exact faces, four script/spacing variants, reading equivalence, six unique proposal IDs and null/false gates. Add `--private-pr` after fetching immutable #488 head to reverify its four recorded source blobs, form IDs, routine Reader positions, exact-only adapter and finally extension. Private source verification passed locally with that flag; default validation makes no claim to execute the unmerged bridge.

No synthesis, owner page, route import, runtime acceptance or progress change occurred.
