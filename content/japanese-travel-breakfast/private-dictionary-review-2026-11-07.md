# Japanese Breakfast private dictionary inventory

This inventory is derived from the exact Japanese/English card pairs in the ten Foundation and first six Core **draft** lessons. The builder pins source file SHA-256 hashes, preserves stage-local and stable lesson IDs, and keeps distinct English glosses as distinct senses. It is not registered in the app, has no released dictionary entries, and changes no learner progress.

| Measure | Current draft |
| --- | ---: |
| Card placements | 200 |
| Exact Japanese–English pairs | 173 |
| Japanese headwords with multiple English glosses | 3 |
| Pair with conflicting card kinds | 1 |
| Pairs lacking reviewed part of speech and inflection | 173 |

Review the following before dictionary use:

- `わかりません` carries both “I do not know” and “I do not understand”; retain separate contextual senses or add usage notes.
- `席` has “seat” and “seat; place at a table”; decide whether the longer gloss adds a distinct sense.
- `確認してください` differs only by English capitalization (“Please check” / “please check”); normalize editorially after checking the lesson context.
- `ありますか` / “Do you have it?” is tagged both `term` and `phrase`; use one reviewed classification.

The English glosses, kana/kanji spellings, part of speech, inflection, register, food/allergy wording and café context still need qualified Japanese and domain review. Future Core and Master drafts must extend this inventory from their exact authored source, then regenerate and recheck hashes. `reviewed:false` and `registered:false` remain mandatory until the release gates are met.
