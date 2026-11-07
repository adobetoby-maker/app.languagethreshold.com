# French 101 Core 4–6 draft checkpoint

This is an authored draft for French target / English support, stacked on Core 1–3 draft PR #250 and program draft PR #241. Stable intended Core module ID is `french-basics`; lesson numbers 4–6 and all existing learner progress remain unchanged. The draft is not registered in the app runtime.

The English anchor is `src/data/spanish-basics-core.json` and the corresponding Reader entries in `src/data/spanish-basics-practice.json`. `source-english-core-4-6.json` pins both full-file SHA-256 hashes and the exact bounded subset. `core-4-6-draft.json` contains original French grammar, dialogue, speaking prompts and checks. The source's adjective agreement, possessive and possession/needs sequence is retained, while French forms are taught instead of Spanish forms.

`python3 scripts/validate-french-basics-core-4-6-draft.py` passes: 42 exact English card/phrase pairs, 18 exact English Reader sentence meanings, file hashes, aligned French lines, dialogue/check structure and `reviewed:false`. The prior Foundation and Core 1–3 validators also pass. This is a source/structure check only, not a fluency or usability judgment.

Independent Fable fidelity and Opus curriculum reviews remain open because the current CLI review budget was exhausted in adjacent French batches. No Haiku call was used for this batch; Codex authored it directly to avoid a failed paid call. Qualified human French review, full Core/Master content, runtime six-mode/Reader/card/dictionary/speaking/offline integration, recorded French audio, phone and native-app acceptance are still open. Broad source glosses such as “class / classroom” and “in / on / at” are deliberately contextual and need reviewer attention.
