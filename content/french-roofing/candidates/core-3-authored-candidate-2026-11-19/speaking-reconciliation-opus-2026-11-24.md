# Critique: French Roofing Core 1–3 speaking reconciliation

This is based only on the pasted text. I did not verify any files, hashes or pins. Nothing here approves any face, and the "fine as is" notes are not qualified approval. Below, "Must fix" means a coherence or parity defect, and "Should fix" means wording or consistency.

## Core 1

**Must fix**

1. **Practice context says the wrong person distinguishes the terms.** The text says "the partner requests repetition and distinguishes the flat/sloped terms." In the turn sequence, the partner asks and the *learner* distinguishes.
   - English: "…the partner requests repetition and asks the learner to distinguish the flat and sloped terms."
   - French: « …le partenaire demande une répétition et fait distinguer plat et en pente. »
2. **The courtesy before the final turn is backwards.** The partner says "Thanks." just before the learner, who is giving the information, closes with "Thank you." That extra "Thanks." is also not covered by `closureProvenance`.
   - Cue 3 → "So is the roof flat?"
   - French → « Alors, le toit est-il plat ? »
   - This keeps the claim that the closure "appears once" accurate.
3. **"Sample" is translated two different ways, and one is wrong.** The text uses "schéma d'échantillon étiqueté" (role), "toit d'échantillon" (goal) and "schéma de toit d'exemple" (context).
   - "Toit d'échantillon" reads as "a roof that is a sample." Use one rendering throughout.
   - Role: « schéma de toit d'exemple étiqueté »
   - Goal: « dire à un collègue si le toit du schéma est plat ou en pente »
   - Context: « étiqueté « en pente » » is clearer than « portant le repère en pente ».

**Should fix**

4. **Provenance wording is ambiguous.** "Existing speaking ID, opening and lesson objective retained" could be read as retaining the *source* objective.
   - Change to "…opening and candidate objective retained" to match the held `sourceObjectiveCompletionStatus`.
5. **French word bank is missing items the English bank has.** English includes "It is not", "No, it is" and "Thank you."
   - Add « Ce n'est pas … », « Non, il est … » and « Merci. »

**Note only; protected fields, do not change in this pass**

6. **Card 15's French rendering is inconsistent.**
   - The Say activity and `grammarExplanationFrench` use « avant que nous commencions ».
   - The candidate row and dictionary for card 15 and Reader 8 use « avant de commencer ».
   - Record this as an open qualified-French item instead of reconciling it here.

## Core 2

**Must fix**

1. **Cue 2 → turn 3 doesn't follow.** "Which sample would you like to see again?" expects a name ("The plywood"), not "Where is the plywood?"
   - Cue 2 → "I have put the cards back in the set. Ask me for a card."
   - French → « J'ai remis les cartes dans le jeu. Demandez-moi une carte. »
   - The learner turn and goal can stay as they are.
2. **Cue 3 should point at the card, not the material.** "Here is the plywood, on the labelled image" can read as locating real material.
   - English → "Here is the plywood card."
   - French → « Voici la carte du contreplaqué. »
   - This matches the context ("asks for the plywood image again") and the label-only framing.

**Should fix**

3. **`internalDecisionHolds` doesn't cover everything in `heldDecisionRefs`.** The refs include card 14 (drip-edge propagation) and Reader 1 (shingle propagation), but no hold entry explains them.
   - Add: "Linked drip-edge (card 14) and shingle (Reader 1) decisions are propagated; not used here."
4. **French word bank is missing "Merci."**

## Core 3

**Must fix**

1. **The French context has an error.** « avec la noue à l'avant du texte » attaches "du texte" to "l'avant," so it reads as "the front of the text."
   - Change to: « avec le repère de la noue à l'avant (repris du texte source) et les repères du solin et de la cheminée ».
2. **Cue 3 doesn't answer "Where is the chimney?"** "The chimney is labelled on this diagram" gives no location.
   - Mirror the flashing cue: "The chimney is labelled here, on this diagram."
   - French: « La cheminée est étiquetée ici, sur ce schéma. »
   - Don't add a position such as "at the back," since the source doesn't give one.
3. **The goal doesn't match the turn.** The goal says "request the flashing label," but the learner says "Show me where the flashing goes," which asks about placement. The partner's label-only reply is what keeps this from being a placement answer.
   - Goal → "Ask about the valleys, ask to be shown where the flashing goes on the sample diagram, and ask where the chimney is; the partner points only to labels."
   - Update `goalFrench` to match.
4. **The leak hold isn't listed in the refs.** `internalDecisionHolds` includes the leak/gotera versus fuite decision, but `heldDecisionRefs` omits card 7, card 15 and Reader 8. Those faces are unheld candidates, so this is an inconsistency, not a missing hold.
   - Add to `heldRefsInterpretation`: "Leak/fuite decision (card 7, card 15, Reader 8) remains an open source question; those candidate faces are not used in this speaking task."

**Should fix**

5. **"Sample" is again translated two ways.** The text uses « schéma de toit d'échantillon » (role and partner role) and « schéma d'exemple » (goal and context).
   - Use « schéma de toit d'exemple » throughout.
6. **French word bank is missing "Oui." and "Merci."**

## Cross-core checks that pass

- **Source objectives.** All three keep the source objectives verbatim and state they are incomplete. None of the new scenes claims to complete one.
- **Roles.** Core 1 and Core 3 explicitly note the change from foreman/lead to coworker. Core 2's original source speaking has no lead, and its record states the source task remains unfulfilled.
- **No readiness or safety implications.** None of the scenes gives equipment readiness, installation order, access, safety or work authorization. Units, measurements and real site data are absent.
- **Source wording.** The English source-exact phrases used in turns are cards 14 and 15, Reader 3, and cards 12 and 13. They are quoted correctly, and the new frames are labelled as new.
- **Register.** The French uses vous consistently and is marked as a proposal only.
- **Protected fields.** No correction above touches source faces, candidate rows, activities, forms or the dictionary. Item 6 under Core 1 is flagged only.
