**Verdict:** the three speaking blocks need corrections before qualified review, mainly one coherence defect per lesson. I found no readiness answer, no safety or work authorization, and nothing to change in candidate rows, activities, forms or dictionary. Hashes and "unchanged from prior candidate" are unverified; this is a critique of the pasted text only.

## Foundation 1

1. **The exchange ends on an unanswered request.** The partner has just repeated the list slowly, then the learner says "Please repeat the list. Thank you." and nothing follows. Reorder so the repeat comes first, then slower, then the thanks:
   - Cue 1: "Good morning, Luis. Welcome to the crew. The list says: the harness, the rope and the hammer." → "Please repeat the list."
   - Cue 2: "The list says: the harness, the rope and the hammer." → "Slower, please."
   - Cue 3: "Of course. The harness… the rope… and the hammer." → "Thank you."
   - Swap the order in `goalEnglish`/`goalFrench` to match, and update the French arrays, `expectedAll*`, `turnSequenceEnglish` and the word bank.

2. **Partner role contradicts the goal and the source.** The goal says "Greet a coworker" / "Saluer un collègue", the source speaking line says "crew member", and Reader 6 says "My coworker talks very fast", but `partnerRole` is "crew lead". Change the partner to "coworker" / "collègue" in the role, both contexts and the cues. This also removes "Are you the crew lead?", which has no source anchor.

3. **Incompleteness is not stated in `provenance`.** Add the sentence Foundation 2 already has: the original objective is not completed by this speaking task. `holdReason` cites card 10 as unmet although card 10 has no hold; say "card 10 unused pending the line 5 decision".

4. **Apostrophes are mixed inside one sequence.** Learner turns use "I’m" and partner turns use "I'm"; the French mixes "m'appelle" with "d’équipe". The source is straight, so normalise the speaking block to straight.

5. **Packet filename differs.** `sourcePacket.path` ends in `packet.json` here but `decision.json` in Foundations 2 and 3; confirm the pin points at the right file.

## Foundation 2

1. **Goal says "wall or nail", but the sequence requires both.** Change to "and" / "et" in `goalEnglish` and `goalFrench`.

2. **Context omits the nail.** Cue 3 asks about it, so add "and nail length" to `practiceContextEnglish` and `contextFrench`.

3. **`contextFrench` misplaces "fictional" and drops "lesson".** "la mesure du mur du récit fictif" reads as "the wall of the fictional story". It also says "délai d’arrivée" where the goal says "délai avant l'arrivée". Suggested: "L'apprenant et le chef d'équipe lisent, sur une fiche de leçon imprimée, des données fictives : l'heure de début, le délai avant l'arrivée du camion, la mesure du mur et la longueur du clou."

4. **The opening is the only figure without the "sheet" framing.** "We start at six in the morning." stands as a bare schedule statement, while your hold note says figures are quoted only. Keep the source line intact and say in the context that the learner reads the first line of the sheet aloud.

5. **`provenance` says "time, quantity and unit figures".** No quantity is used, since bundles are held. Change to "time, length and unit figures".

6. **Two holds have no origin note.** Card 9 and reader line 3 are held in the supplement, but the pinned decision gives them "Combien de paquets ?" and "On a besoin de combien de paquets aujourd’hui ?" with no review note. Record these as supplement-originated holds, as Foundation 3 does with `internalCorrectionNote`.

## Foundation 3

1. **The word bank cannot build turn 1.** "A wet roof is slippery and dangerous." needs "A wet roof is", which is missing. Add it.

2. **Cue 3 and its reply do not fit.** "Anything else?" → "That is my report. Is the equipment ready?" closes and then opens a question, and `closureEnglish` is not the last utterance.
   - Preferred: cue "Do you have a question?" / "Avez-vous une question ?" → "Yes. Is the equipment ready?" / "Oui. Est-ce que le matériel est prêt ?", with closure recorded as none (ends on an open inquiry).
   - If the schema requires a closure: move "That is my report." to the end of turn 2 and keep turn 3 as the bare question.

3. **Cue 2 is a leading double question.** "How is the air, and when is the roof hot?" presupposes the answer. Replace with "Thanks. And the temperature?" / "Merci. Et la température ?"; the reply is unchanged.

4. **The Reader 4 hold note is ambiguous.** "candidate source face unchanged" sits beside a candidate row that carries "L'air est froid le matin." State instead: the packet's `conditionalFrench` stays null, and candidate reader:4 carries the supplemental rendering pending a qualified French decision.

5. **Incompleteness is not stated in `provenance`.** Add the same sentence as in Foundation 1; "safe" and the ser/estar contrast currently appear only in `holdReason`.

## Across the three lessons

- **"fictional" is missing in French.** `contextFrench` in Foundations 1 and 3 says "un personnage"; make it "un personnage fictif".
- **"crew lead" and "crew boss" both map to "chef d'équipe".** If Foundation 1 switches to "coworker", the only remaining overlap is source-derived (Foundations 2 and 3); note it for qualified review and leave the dictionary rows alone.
