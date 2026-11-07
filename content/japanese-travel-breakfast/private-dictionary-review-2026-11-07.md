# Japanese Breakfast private dictionary inventory

This inventory is derived from exact Japanese/English card pairs in ten Foundation and thirty Core **draft** lessons. The builder pins both source file SHA-256 hashes, preserves stage-local and stable lesson IDs, and keeps distinct English glosses as distinct senses. It is unregistered, has no released dictionary entries, and changes no learner progress.

| Measure | Current draft |
| --- | ---: |
| Card placements | 522 |
| Exact Japanese–English pairs | 404 |
| Japanese headwords with multiple English glosses | 11 |
| Pairs with conflicting card kinds | 2 |
| Pairs lacking reviewed part of speech and inflection | 404 |

The eleven headwords requiring sense review are `ありがとうございます`, `お会計`, `わかりません`, `カフェオレ`, `予約`, `少なめ`, `席`, `料金`, `明細`, `確認してください`, and `調理器具`. Some are contextual distinctions; others may be editorial duplicates. Keep exact authored glosses until a reviewer resolves them. In particular, `わかりません` has “I do not know” and “I do not understand”; `料金` has three related glosses; `確認してください` differs only by English capitalization.

`ありますか` / “Do you have it?” and `カードで払えますか` / “Can I pay by card?” are each tagged both `term` and `phrase`. Review their classification before use.

The English glosses, kana/kanji spellings, part of speech, inflection, register, café context and food/allergy wording still need qualified Japanese and domain review. New Master drafts must extend this inventory from their exact authored source, then regenerate and recheck hashes. `reviewed:false` and `registered:false` remain mandatory until release gates are met. This inventory is not imported by runtime code or included in audio synthesis.
