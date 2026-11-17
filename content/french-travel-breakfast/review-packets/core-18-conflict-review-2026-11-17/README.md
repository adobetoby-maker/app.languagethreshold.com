# French Breakfast Core 18 — allergy terminology decision record

This inert French→English record exposes three unresolved choices in the [source-aligned Core 18 packet](../core-18-20/README.md). It pins the current Spanish lesson and existing French packet by SHA-256. `decision.json` provides conditional alternatives with literal English glosses; none is a selected practice answer, speaking target, dictionary sense or recording script. The existing packet and all its stable card/Reader IDs remain unchanged.

| Source anchor | Issue for qualified review |
| --- | --- |
| Card 7/12 and Reader 2 | The source says Elena has an allergy to nuts. The archived French *focus* adds **grave**, a severity grade absent from the pinned card and Reader. Decide the lesson's intended clinical meaning before aligning focus, speaking and any scored answer. |
| Card 8 and Reader 7 | Spanish uses *contaminación cruzada* while source English uses *cross-contact*. The draft uses *contact croisé*. Decide the French term for the intended locale and align both rows and the contextual dictionary. |
| Card 6/12 and Reader 2/4/6 | Spanish *nueces* and English *nuts* require an ingredient-scope decision. The story separately names almond milk in a shared jug. Decide whether the intended term is *fruits à coque* or a narrower nut term; do not add peanuts without a source decision. |

The barista reports bread with nuts in the same display case, shared tongs and a shared jug. These are source statements about a risk; the packet does not turn them into a claim that any food or drink is safe. Clinical vocabulary remains direct. Internal source and food-allergy questions are kept in `decision.json`, separate from learner-facing draft rows.

Run `python3 content/french-travel-breakfast/review-packets/core-18-conflict-review-2026-11-17/validate.py` from the repository root. It checks the pinned source and packet hashes, the exact source order and stage-local IDs, the three decision anchors and false gates. Structural validation and an AI critique are not qualified French, clinical, food, locale, curriculum or dictionary review.

This record is source-only repository material. No owner page, web/native import, audio, scoring, offline pack, saved-item migration, progress write or V4 route uses it. The archived `modeInputIdsDraft` lists card IDs only; they do not supply six authored See/Recall/Hear/Type/Say/Write prompt-and-answer pairs. Any eventual text correction changes the exact audio scope and needs its own technical verification and per-clip listening decisions. All review and release gates remain false.
