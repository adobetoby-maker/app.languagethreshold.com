# Japanese Breakfast Core 6 — source conflict decision worksheet

This worksheet keeps the existing Core 6 Reader 8 Japanese face **unselected**. It records two translation candidates only if a qualified source editor elects to retain the current Spanish and English line. Neither candidate is a learner answer, recording script, or approved medical statement. The current source line is about the narrator's choice to ask only about ingredients; it does not teach a clinical decision rule.

The current Reader asks what ingredients “it” has in turn 3, without naming the food, then names bread for the first time in turn 5. The kitchen's statement in turn 5 is limited to the bread's listed contents; it does not establish cross-contact safety. A source editor should decide whether to name the referent in turn 3 and align the Spanish and English Reader before any candidate is promoted. The separate Core 18 cross-contact scene must not be imported here.

The [existing source scene packet](../core-6-source-scene/README.md) retains 16 source-order cards, eight Reader turns, the stable lesson identity, and the withheld Reader 8 face. This worksheet adds no lesson/card/Reader ID, scoring answer, audio, owner route, learner runtime, offline pack, progress write, or V4 import. All gates remain false. The source and packet hashes and the continuing null face are checked by `python3 content/japanese-travel-breakfast/review/core-6-conflict-resolution-2026-11-17/validate.py` from the repository root.

Qualified Japanese, Spanish source, clinical/allergy, food, curriculum and dictionary reviewers must decide whether Reader 8 belongs in this lesson, whether `材料` or `原材料` suits the ingredient question, how to preserve kitchen attribution without implying cross-contact verification, and how `frutos secos` versus `nueces` should be mapped across Core 6/18/27/30. Candidate alternatives and reviewer questions are in `decision.json`.

Claude CLI `--safe-mode --model haiku` was attempted for read-only critique but returned `Not logged in`, zero input/output tokens, no model usage and no content. The worksheet was source-checked manually. No AI or structural check is qualified approval.
