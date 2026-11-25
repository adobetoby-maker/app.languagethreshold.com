# Critique: Core 1–3 speaking / original-scope reconciliation

This is based on the pasted text only; I could not check hashes or files. Protected fields (source faces, activities, forms, dictionary, candidate rows) are treated as fixed, so every correction below lands in `speaking` or the grammar explanation.

## Corrections, by priority

**1. Core 2: `card:2` has an open source question that the speaking block does not acknowledge.**
- Source decision question 6 (archived versus source speaking objective) lists `card:2` in `affectedIds`.
- The candidate row for `card:2` has `hold: null`, and it is the speaking opening and first anchor.
- It is missing from `heldDecisionRefs`, and `heldRefsInterpretation` says nothing about it.
- Fix: add a sentence to `heldRefsInterpretation`, as Core 3 does for the leak cards. For example: "Objective-parity question for card1/card2/card4 remains open although the card2 candidate face is unheld; card2 is used only as a generic sample label."

**2. Core 2: the context describes an exchange that does not happen.**
- `practiceContextEnglish` says the learner "asks for the plywood image again". The learner never asked for it before, and the turn is "Where is the plywood?", which is a location question.
- Fix (English): "…and the learner asks where the plywood card is."
- Fix (French): replace "redemande l'image du contreplaqué" with "demande où se trouve la carte du contreplaqué".

**3. Core 2: sample, image and card are mixed.**
- `learnerRole` says "labelled material samples", the goal says "a sample", `partnerRole` says "practice cards", and the context says "sample-image cards".
- "Material samples" reads as identifying physical product, which the provenance disclaims.
- Fix: use "labelled sample-image cards" / "cartes d'images d'échantillons étiquetées" in both roles and both goals.

**4. Core 1: the closing "Thank you." is on the wrong speaker.**
- The learner is the informant in all three replies, then thanks the person who asked the questions.
- Fix: end the last learner turn at "No, it is sloped, not flat." and move the thanks into the partner's turn, or give the partner a final line that earns the thanks.
- If you change it, update `closureProvenance`, `closureEnglish`/`closureFrench`, both word banks and both `expectedAll…` arrays.

**5. Core 1: "request" versus "consigne" in the grammar explanation.**
- English says `Check + object` is "a short imperative request"; French says "formule une consigne courte" (an instruction).
- The source is a plural command ("Revisen…"), and Core 2 already holds on ask-versus-order force.
- Fix: choose one force in both languages, either "imperative instruction" / "consigne" or "request" / "demande". Also check `candidateObjectiveEnglish` ("request a pitch check") against that choice.

**6. Core 1: the last `internalDecisionHolds` item names the wrong fields.**
- No form contains either French variant.
- "Avant de commencer" is in candidate rows `card:15` and `reader:8` and in `dictionary:15`.
- "Avant que nous commencions" is in `activity:say` and `grammarExplanationFrench`.
- Fix: rewrite the hold to name those fields and drop "forms".
- Add the substance of the question: after "Vérifiez", "avant de commencer" reads as "before you start", so the source "we" is lost.
- `grammarExplanationFrench` currently states "signifie « avant que nous commencions »" as settled. Soften it to "ici rendu par…" while the hold is open.

**7. Word banks cannot build the expected turns and are not parallel.**
- **Core 1 English:** "It is not" + "flat roof" cannot produce "It is not a flat roof." Add "a flat roof" or "a".
- **Core 1 French:** there is no "un toit plat" for "Ce n'est pas un toit plat."
- **Core 1 parity:** the French bank includes the partner's question "Le toit est-il plat ou en pente ?", which the English bank does not. Drop it or mirror it.
- **Core 2 French:** the bank offers "la sous-couche" and "le contreplaqué", but the expected turns need "de la sous-couche" and "du contreplaqué". Add the partitive forms.
- **Core 2 parity:** "deuxième carte" is partner-cue vocabulary with no English counterpart. Remove it.
- **Core 3 French:** "Où se trouvent les noues ?" is truncated against the expected "Où se trouvent les noues sur ce toit ?". Use the full string.

**8. Core 3: internal provenance wording appears in a learner-facing field.**
- `practiceContextEnglish` says "the source front-valley label", and the French says "repris du texte".
- Fix: "a front-valley label" / "le repère de la noue à l'avant". The Reader 6 derivation is already in `provenance`.

**9. Core 3: `reader:7` is anchored but not explained.**
- `provenance` explains only Reader 6.
- Fix: drop `reader:7` (since `card:12` already anchors the sentence) or add "flashing request is card 12 / Reader 7, speaker unattributed in source".

**10. Core 3 French: "label" is rendered two ways.**
- "Label" becomes "repère" while "labelled" becomes "étiqueté(e)", across the cues, goal and context.
- Fix: choose one pairing, for example "repère" / "repéré", or "étiquette" / "étiqueté".

**11. Core 1: cue 3 is redundant (optional).**
- "So is the roof flat?" follows two explicit "not flat" answers.
- Fix: a confirmation form such as "So the roof is not flat?" keeps the same reply and is more plausible.

## Checked with no correction needed

- **Scope:** the original objective is explicitly incomplete in all three lessons (`sourceObjectiveCompletionStatus`, `holdReason`, `provenance`).
- **Safety:** no speaking turn gives an equipment-readiness answer or a safety or work authorization.
- **Units:** no units or measurements appear.
- **Held refs:** `heldDecisionRefs` match the held candidate rows in all three lessons.
- **Roles:** the coworker-for-foreman/lead substitutions are recorded as holds.
- **Gates:** all gates and `reviewed` flags are false, and nothing implies qualified approval.
