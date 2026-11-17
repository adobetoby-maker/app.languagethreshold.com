# French Breakfast Core 30 — source decision record

This inert worksheet makes the two incompatible Reader 4 outcomes explicit for qualified source, French, food-allergy and curriculum review. It does not choose an outcome or supply a learner answer. The existing [Core 30 packet](../core-30/README.md) keeps Reader 4, Write prompt and Write target `null`; this record leaves them that way.

Current main says the cook reports no nuts in the recommended kids’ scrambled-egg menu. A separate unmerged source correction says the kitchen cannot rule out cross-contact and the family uses food brought for the daughter. The two conditional French renderings and their literal English glosses are in [decision.json](decision.json). Neither wording is approved or an audio script. The current-source rendering attributes the no-nuts claim to the cook and makes no cross-contact safety assertion. The alternate uses the archived French candidate for its different scene and needs terminology review.

Reader `core:30:line:4`, cards `core:30:word:4` and `core:30:word:5`, surrounding Reader turns 3 and 5, all six practice modes, speaking, Write and any saved-item mapping need one coherent source revision. The archived mode data are card-ID lists, without authored prompt/target pairs. There is no recoverable Write response to reuse. A source change also changes exact-text audio scope and needs new clip decisions.

Run `python3 content/french-travel-breakfast/review-packets/core-30-decision-review-2026-11-17/build.py --check` and `python3 content/french-travel-breakfast/review-packets/core-30-decision-review-2026-11-17/validate.py` from the repository root. The validator pins the existing packet and current source, checks both branches, keeps the answer fields null and confirms every gate is false. These checks cannot decide food-allergy safety or qualify French usage.

No owner page, learner route, audio route, offline pack, progress writer or V4 app imports this record.
