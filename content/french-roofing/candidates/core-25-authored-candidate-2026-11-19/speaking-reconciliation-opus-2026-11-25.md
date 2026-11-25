# Read-only critique: French Roofing Core 25–27 additive speaking supplements

This is a critique of the pasted text only. I made no edits and checked no files, hashes or repository state. AI critique is not qualified approval, and every gate stays `false`.

## Checks that pass in all three lessons

- **Prior values are unchanged.** Every key in `priorSpeaking` appears in `speaking` with the same value: roles, opening, goal, word bank, cues, expected turns, French support, refs, `heldDecisionRefs`, `turnSequenceEnglish` and scaffold vocabulary. No pair was re-authored.
- **The French 7-turn sequences match the existing values.** Each `turnSequenceFrench` follows `candidateOpeningFrench`, then cue[0], expected[0], cue[1], expected[1], cue[2], expected[2]. Every string matches the existing values exactly, and the speaker order matches the English.
- **The all-learner arrays are correct.** `expectedAllLearnerTurns{English,French}` is the opening plus the 3 expected turns, in both languages.
- **`closureFrench` "Merci." is consistent** with the final learner turn and the merged-closure provenance.
- **`sourceTextProvenance` is literal.** Every `exactSourceEnglish` and `sourceKind` matches the `sourceEnglish` and `kind` in `exactUsedSourceFaces` for every anchor.
- **The question pointers line up.** `sourceMissionOpenQuestionPointers` covers indices 0–4, 0–3 and 0–4, matching the question counts. In every dependency, `sourceQuestion` equals the pointer index plus one, and the `question` text is a verbatim copy.
- **The direct versus inferred labelling is correct.** No used anchor appears in any `affectedIds` list, so every dependency is correctly marked as not direct, and the immutable `affectedIds` lists are untouched.
- **Mission status is correct.** The original mission is marked held/incomplete, the lexical exchange is marked as not replacing it, and readiness/diagnosis/approval are disclaimed in `scopedInternalDecisionHolds`.

## Concrete new-field corrections

### All lessons

1. **`frenchSupportConventionInternal`**
   - Problem: the new array name `expectedAllLearnerTurnsFrench` contains "expected", which conflicts with "never expected/scored learner production".
   - Fix: append "French arrays named `expected*` mirror the English expected turns as meaning support only; they are not French production or scoring targets."

2. **`openSourceQuestionDependencies[*].relationship`**
   - Problem: the wording mixes "Sense adjacency", "Alert-sense adjacency" and "Inferred from…".
   - Fix: add an explicit `"dependencyType": "inferred"` field to every entry, or start every relationship string with "Inferred (adjacency):". This makes the direct/inferred distinction machine-checkable.

3. **`newNotes[2]`**
   - Problem: "full-file/source hashes verified independently" cannot be supported from this bounded paste.
   - Fix: reword to "full-file/source hash verification is outside this CLI view and must be recorded separately". Alternatively, cite the verifying artifact.

4. **`partnerRoleFrench` / `learnerRoleFrench` articles**
   - Problem: the English roles use indefinite plurals ("showing picture/word cards"). Core 26 partner uses *des*, but the other roles use *les*.
   - Fix for parity: use *des* throughout:
     - Core 25: "…qui repère et nomme des cartes de vocabulaire." and "…qui montre des cartes-images et des cartes de vocabulaire."
     - Core 26 learner: "…qui demande et décrit des cartes-images."
     - Core 27: "…qui nomme des images de vocabulaire." and "…qui montre des cartes-images."

### Core 26

5. **Question 4 dependency (`/sourceDecisionQuestions/3`)**
   - Problem: the question explicitly names "showing the damaged area", which is the direct counterpart of the learner turn "The area is damaged."
   - Fix:
     - Set `affectedUsedAnchors` to `["…card:9", "…card:7"]`.
     - Set relationship to: "Inferred from archived damaged-area/measuring additions explicitly named in Q4, not direct affectedIds."
     - Set speakingScope to: "Damaged-area picture and measurement word only; no archived showing/measuring requirement or measured value."
   - Card 1 also qualifies, since the question names "repair photo before cover". Add it if you apply the explicit-mention rule consistently.

6. **Question 3 dependency (`/sourceDecisionQuestions/2`)**
   - Problem: the question text says "a photo records… A photo alone…", and the same explicit-photo rule put card 6 into the Question 2 dependency, but card 6 is missing here.
   - Fix: add `"…card:6"`, or state why card 6 is excluded.

### Core 27

7. **Chimney (card 9) has no dependency.**
   - Problem: the source objective is about roof penetrations, and a chimney is one. Question 4 ("photo of flashing around each penetration") is the clear adjacency.
   - Fix: add this entry:
     ```
     { sourceQuestion: 4,
       jsonPointer: "/sourceDecisionQuestions/3",
       affectedUsedAnchors: ["core-roofing:27:fr-en:card:9"],
       relationship: "Inferred roof-penetration adjacency, not direct affectedIds. Immutable affectedIds unchanged.",
       status: "open; no source decision selected",
       speakingScope: "Chimney picture only; no penetration walk, flashing photo, checked status or approval." }
     ```

8. **`scopedInternalDecisionHolds[0]` does not mention repair approval.**
   - Fix: change to "…a crack or leak diagnosis, a repair product, repair approval/completion, or an inspection approval."

## Existing issues, internal only (no changes proposed)

- **Core 25:** `usedCandidateRows` card 8 uses *le cône*, while `conditionalFrench` uses *le cône de signalisation*. This divergence is intentional and documented. Card 11, Reader 2 and Reader 4 are absent from `heldDecisionRefs`.
- **Core 26:** `contextFrench` writes "C porte measurement" without quotes, unlike « repair photo ». `goalEnglish` omits the measurement turn. The word bank lacks the cue "What does word card C say?". Card 12 and Reader 3 are not in `heldDecisionRefs`.
- **Core 27:** `goalEnglish` order (crack, chimney, sealant) differs from the turn order. The sealant face is read as English on the card but supported as *Produit d'étanchéité*, which is already acknowledged in the notes.

No other new-field defects were found within the pasted scope.
