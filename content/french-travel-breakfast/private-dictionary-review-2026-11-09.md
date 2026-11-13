# French Breakfast dictionary candidate — private review ledger

The deterministic inventory in `private-dictionary-candidate.json` is pinned to `private-runtime-candidate.json`. It records all 1,117 word placements in 60 draft lessons, grouped into 901 French surface forms. Each placement retains its exact French text, English gloss, source English text, stable word ID, lesson key, and the lesson's Reader line IDs. No candidate sense is approved, and nothing is registered in the learner dictionary.

There are 56 surface forms with more than one exact English gloss. These all remain in `multipleGlossReviewQueue`; a different article, synonym, or truly distinct meaning must be resolved in context by a qualified French reviewer before release. Examples needing deliberate sense decisions:

| French surface | Lesson evidence | Distinction to review |
| --- | --- | --- |
| `le café` | `core:1` = `café; coffee shop`; `foundation:1` = `the coffee`; `foundation:5` = `the café` | Place versus drink; inspect each Reader context. |
| `la carte` | `core:23` = `map`; `foundation:9` = `the card`; `core:19` = `menu` | Map, card, and menu are distinct contextual meanings. |
| `une brioche` | `core:23` = `sweet bread`; `core:28` = `brioche` | Check whether the broad gloss loses the pastry distinction. |
| `la tasse` | `core:10` = `cup`; `master:3` = `the mug` | Cup versus mug in the authored context. |
| `les fruits à coque` | `core:18` = `nuts`; `master:8` = `the tree nuts` | Preserve the precise food-allergy term and source meaning. |

Clinical and food-allergy vocabulary remains direct in learner drafts. This ledger is internal review evidence; it does not authorize replacing exact source terms with hedges or safety commentary. Qualified French and domain review, stable context-specific sense IDs, runtime links, audio, and exact-pair acceptance remain open. `reviewed:false`, `registered:false`.

The generated `private-dictionary-review.html` displays every multiple-gloss placement with the exact lesson objective and its full paired Reader context. This is a read-only worksheet; it contains no approval state or runtime hook.

Regenerate both artifacts with `python3 scripts/build-french-travel-private-dictionary.py`; verify with `python3 scripts/build-french-travel-private-dictionary.py --check`.
