# Japanese Breakfast Core 2 — source conflict decision record

This source-only record exposes the three unanswered Japanese faces in the [Core 2 source-scene packet](../core-2-source-scene/README.md). It pins the exact current Spanish and English rows and gives two **unselected** Japanese renderings for each. The existing `targetJapaneseDraft: null` values remain unchanged. None of the options is a practice answer, recording script, saved item, or reviewer approval.

## Decisions for a qualified source and Japanese reviewer

| Source row | Conflict | Required decision |
| --- | --- | --- |
| Card 1 and Reader 3 | Spanish *café americano* and its espresso-with-water note identify a menu item; source English calls it “black coffee,” a broader category. | Choose the intended coffee concept and revise the source card and Reader together before selecting Japanese text. |
| Reader 7, with Card 17 | The Spanish and English Reader put the “here or to go?” question in the traveler's mouth. The phrase is usually asked by café staff; Card 17 alone is speaker-neutral. | Decide who speaks in the intended exchange. If staff speaks, revise both source Reader languages and the card's role before selecting Japanese text. |

The alternatives and literal glosses are in `decision-record.json`. The traveler still asks whether oat milk is available; the source never says she orders oat milk, so this record adds no order line. This record gives the owner a concrete source decision without assigning a learner answer. Qualified Japanese, café locale, source-curriculum and dictionary review remains open.

Run `python3 content/japanese-travel-breakfast/review/core-2-conflict-review/validate.py` from the repository root. The validator pins the existing packet and current Spanish lesson hashes, checks exact source positions and stable row IDs, confirms all three existing faces remain null, and requires every release gate to remain false. It does not judge language quality or approve a source edit.

No web, owner, audio, progress, offline or independent V4 route imports this record. Any later source correction needs a new source revision, aligned card/Reader IDs and exact-text audio scope; old saved positions and recordings do not transfer automatically.
