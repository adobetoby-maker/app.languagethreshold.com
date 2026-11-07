# Japanese Breakfast private dictionary inventory

This inventory is derived from exact Japanese/English card pairs in the complete ten Foundation, thirty Core, and twenty Master **draft** lessons. The builder pins every source file SHA-256 hash, preserves stage-local and stable lesson IDs, and keeps distinct English glosses as distinct entries. It is unregistered, has no released dictionary entries, and changes no learner progress.

| Measure | Current draft |
| --- | ---: |
| Card placements | 833 |
| Exact Japanese–English pairs | 659 |
| Japanese headwords with multiple English glosses | 20 |
| Pairs with conflicting card kinds | 2 |
| Pairs lacking reviewed part of speech and inflection | 659 |

The [full source-context review queue](private-dictionary-full-review-2026-11-07.md) lists all twenty multi-gloss headwords and their exact English glosses and lesson occurrences. It calls out related meanings, singular/plural wording, capitalization, and contextual translations without automatically merging them.

`ありますか` / “Do you have it?” and `カードで払えますか` / “Can I pay by card?” are each tagged both `term` and `phrase`. Review their classification before use.

Japanese wording, English sense, script/readings, part of speech, inflection, and register need qualified review. The learner-facing clinical vocabulary remains direct and precise; factual or terminology review questions belong in the internal queue, not in cards or lessons. `reviewed:false` and `registered:false` remain mandatory until release gates are met. This inventory is not imported by runtime code or included in audio synthesis.
