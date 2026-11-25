# Core 4–6 speaking reconciliation: corrections

This is a read-only review. I couldn't verify hashes or file state, so the findings below come only from the pasted text. The gates, `reviewed:false` flags and "held and incomplete" statements are consistent across all three lessons. No speaking turn answers equipment readiness or authorizes work or safety.

## Core 4

1. **Ridge turn provenance overstates fidelity.** Reader 1 says the ridge is *at* the highest part. The learner turn says the ridge *is* the highest part. Change `scenarioProvenance` from "follows source Reader 1" to "adapted from Reader 1 (at → is)."
2. **French support for the ridge turn has no documented source.** `expectedLearnerTurnsFrench[1]` ("Le faîtage est la partie la plus haute du toit.") matches neither the source `conditionalFrench` ("Au point le plus haut…") nor the reader:1 candidate ("Dans la partie la plus haute…"). Label it a new composition in the speaking provenance.
3. **`goalEnglish` and `goalFrench` stop at three steps.** The exchange has a fourth learner turn (summary plus closure). Add "then summarize what you see."
4. **`objectiveProvenance` mixes up the objective and the speaking task.** It calls "ridge-vent and downspout placement" the objective. That is the source speaking task. The source objective, "Name ridge and drainage components," is also incomplete because ridge cap, vents, fascia, soffit and attic are held. State both separately.
5. **One internal note is out of date.** It says the speaking "practices unheld gutter/downspout language only." The speaking now also covers the ridge. Update it to "gutter/downspout/ridge."
6. **`contextFrench` wording.** "schéma de toit d'exemple" is awkward. Use "un schéma de toit fictif étiqueté," which also signals that the picture is hypothetical.

## Core 5

1. **Partner cue 2 doesn't follow from the prior turn.** "What else would you like to know?" assumes the learner already asked a question, but the learner only repeated a quantity. Use "Anything else?" / « Autre chose ? ». That still leads naturally into the delivery question without inviting more products.
2. **Partner cue 3 French.** "Je vérifierai" reads as deferred. "I will check" here means right now, so use « Je vais vérifier la date de livraison. »
3. **`objectiveProvenance` mixes up the objective and the speaking task.**
   - It calls "confirm specified fasteners and sealants" the source objective. The objective is "Request roofing fasteners and sealants clearly." The speaking task is "confirm the fasteners specified for this job."
   - Say explicitly that sealants are not practiced at all, even though card 9 is unheld. That is part of why the original objective is incomplete.

## Core 6

1. **`partnerRole` contradicts the dialogue.** It says "A small group responding," but every cue is a practice partner asking about language functions, which is what `practiceContextEnglish` describes. Change it to "A practice partner prompting language functions." The opening is spoken in role to a group while the cues are out of role, so note that framing shift in `scenarioProvenance`.
2. **`openingProvenance` says "printed training phrase."** "Printed" suggests the printed drawing that `scenarioProvenance` disclaims. Change it to "source training phrase."
3. **`objectiveProvenance` should list what is missing.** Assignments, work zones, material staging and the two-minute duration are all absent. Card 6 (work zone) and card 7 (assignment) are unheld, yet the speaking doesn't use them. That omission belongs in the incompleteness statement, not just the held role and staging decisions.
4. **Partner cue 3 French (optional).** « inviter à poser des questions » → « inviter le groupe à poser des questions ».

## All three lessons

1. **The last `internalNotes` entry is identical in every lesson.** It names drainage, fastener and morning-brief objectives and "No actual order" regardless of lesson. Make it specific to each lesson.

## Outside the speaking scope (log for review, don't edit in this pass)

1. **Provenance says "from `conditionalFrench`" where the French actually comes from revised candidate rows:**
   - Core 4 hear: "Où va…" vs. source "Où se place…"
   - Core 4 write: "à l'écart de" vs. source "loin de"
   - Core 6 hear: "comprend" vs. source "a-t-il compris"
   - Core 6 write: "plan prévu pour le toit aujourd'hui" vs. source "plan de toiture du jour"

   The provenance should read "from candidate row card N (revised)."
2. **The Core 6 card 11 candidate French is ambiguous.** "le plan prévu pour le toit aujourd'hui" can mean "planned today" or "the plan for today." The speaking opening inherits this. Add it to the plan-sense review question.
3. **Core 5 form 2 `meaningFrench` is grammatically wrong.** "verbe à l'impératif" doesn't fit: "Veuillez confirmer" is *veuillez* + infinitive.
4. **French parity gap in forms.** `exampleMeaningFrench` is missing on Core 4 forms 2–3 and Core 5 forms 1–3.
