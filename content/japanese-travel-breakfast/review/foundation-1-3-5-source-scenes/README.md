# Japanese Breakfast Foundation 1, 3 and 5 source-scene candidates

`source-setting-candidates.json` is inert review material. It proposes Japanese for the current Spanish/English Breakfast source, not a learner lesson. `build.py` pins the curriculum, Reader and archived Japanese draft hashes. `validate.py` independently checks source order, stable candidate IDs, archived positions and closed gates.

| Lesson | Source scene and material drift from archived Japanese draft | Candidate size |
| --- | --- | --- |
| Foundation 1 | Sam greets Rosa in Oaxaca and orders orange juice, coffee with milk but no sugar, and eggs with tortillas; Rosa recommends a churro and sweet bread. The archived Sam/Staff café scene omits these source turns. | 14 cards, 9 Reader turns |
| Foundation 3 | Daniel asks Rosa about an available table and today's sweet bread, then receives coffee, orange juice and chilaquiles with salsa. The archived Sam/Staff scene omits Daniel, Rosa, Oaxaca and the chilaquiles exchange. | 14 cards, 9 Reader turns |
| Foundation 5 | Emma orders chilaquiles at Diego's café near the market, asks for terrace seating and card payment, and later goes to the bakery. The archived Sam/Staff scene omits that source sequence. | 15 cards, 9 Reader turns |

The source English and Spanish are kept as separate exact fields. They are **not** asserted to be literal glosses of the proposed Japanese. Candidate IDs contain a source-scene revision and preserve the stable stage-local lesson IDs. The archived cards and Reader have no row IDs; their position maps retire the old positions in this candidate only. No saved-item migration, scoring target or progress write is authorized.

All review, learner, audio, listening, offline, progress and owner-route gates remain false. Existing audio cannot cover the new exact text. If a lesson is later promoted, qualified Japanese, food and Oaxaca locale review must resolve the packet questions and align dictionary, speaking, six authored modes, exact-text audio and saved-item identity. Spanish `ser/estar` in Foundation 3 has no one-to-one Japanese grammar objective. A candidate is not qualified approval.

Run `python3 content/japanese-travel-breakfast/review/foundation-1-3-5-source-scenes/build.py --check` and `python3 content/japanese-travel-breakfast/review/foundation-1-3-5-source-scenes/validate.py` from the repository root.
