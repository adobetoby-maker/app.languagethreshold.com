# Core 28–30 additive speaking supplement critique

This is a bounded critique of the pasted JSON only. I did not read files, check hashes, confirm source pins or check the full repo. This is not AI-qualified approval, and every gate stays `false`.

## Preservation check (all three lessons)

I compared every `priorSpeaking` key against `speaking` field by field. All earlier English and French values are exact: roles, openings, goals, contexts, word banks, cues, expected turns, closure, anchors, `heldDecisionRefs`, `holdReason`, `turnSequenceEnglish` and scaffold. No pair is duplicated or regenerated. `exactUsedSourceFaces`, `usedCandidateRows`, `sourceDecisionQuestions` and gates were not touched.

## What passes

- **Derived 7-turn French sequences (28, 29, 30).**
  - Turn 1 equals `candidateOpeningFrench`.
  - Partner turns equal `partnerCueSupportFrench[0..2]`.
  - Learner turns 3, 5 and 7 equal `expectedLearnerTurnsFrench[0..2]`.
  - The speaker order mirrors the English sequence exactly.
- **`expectedAllLearnerTurns{English,French}`.** Each is the opening plus the three expected turns, in order, in both languages.
- **`closureFrench`.** "Merci." matches the final merged turn in all three.
- **`sourceTextProvenance`.** Every exact English face matches `exactUsedSourceFaces.sourceEnglish`. This includes the full Core 30 Reader1 sentence.
- **Dependency pointers.** Each `sourceQuestion` (counted from 1) maps to the correct `/sourceDecisionQuestions/n` (counted from 0). Each `question` string copies its source question verbatim.
- **Direct vs inferred.** Core 30 Q1 is correctly `direct`, because card:1 and reader:1 are both in its `affectedIds`. All other dependencies are correctly `inferred`.
- **Mission status.** `sourceMissionOpenQuestionPointers` lists every question in each lesson. The mission is held and incomplete everywhere.
- **Core 30 language conflict.** The Spanish source objective is kept literally. English is target, `qualifiedEnglishCapstoneObjectiveSelected: false` and `sourceObjectiveCompletionClaim: false`. No English capstone is silently accepted.
- **Core 30 Reader1 provenance.** The exact Reader1 sentence is kept separate from the abridged "The briefing is in the morning." picture statement.

## Concrete new-field corrections

### All lessons: `learnerRoleFrench`
"initie … aux questions" is ungrammatical, because *initier* needs a direct object.
→ `"Un apprenant qui pose des questions sur les images de vocabulaire et y répond."`

### All lessons: `partnerRoleFrench`
"cartes de mots" conflicts with the preserved scaffold, which uses `"word card": "carte de vocabulaire"`.
→ `"Un partenaire qui tient et montre toutes les images et cartes de vocabulaire."`

### All lessons: `frenchSupportConventionInternal`
The sentence "No qualifiedSenseReviewPending flag is inferred…" reads as if it contradicts the existing `usedCandidateRows` entries, which have `qualifiedSenseReviewPending: true`.
→ Replace that sentence with: `"Existing usedCandidateRows qualifiedSenseReviewPending values are preserved; this supplement adds none and infers none from reviewed:false."`

### Core 28: `sourceCompositionProvenance`
"nails is new grammatical plural" mislabels a plural that was composed earlier as new.
→ `"…nails is an earlier-composed grammatical plural from source singular nail…"`

### Core 28: `scopedInternalDecisionHolds`
Two additions:
- **Uncovered held refs.** `heldDecisionRefs` includes card:13, card:16, reader:2, reader:4 and reader:9, but no hold line or source question covers them. Add this line without inventing a reason: `"card:13, card:16, reader:2, reader:4, reader:9 held per heldDecisionRefs; no sourceDecisionQuestion lists them and the reason is not in the supplied excerpt."`
- **Equipment readiness.** Append to the first line: `"…; the pictured broom and nails imply no broom, magnet or pickup-equipment availability or readiness."`

### Core 29: `scopedInternalDecisionHolds[0]`
The scope omits the anchored `finished` (card:5) and `task` (card:7).
→ `"…covers only the fictional task-status (unfinished), task-tomorrow and remaining-materials cards and the learner's 'finished' question; …"`

### Core 29: uncovered held ref
reader:9 is in `heldDecisionRefs` but no question or hold covers it. Add: `"reader:9 held per heldDecisionRefs; no sourceDecisionQuestion lists it and the reason is not in the supplied excerpt."`

### Core 30: `openSourceQuestionDependencies[0].relationship`
The clause is duplicated.
→ `"Direct: card1 and Reader1 are listed affectedIds. Immutable affectedIds unchanged."`

### Core 30: `sourceLanguageObjectiveConflict.archivedLanguageChangeEvidence`
The value is the text of review question /0, not the archived French objective. Labelling it as evidence breaks literal provenance.
→ Rename the key to `sourceDecisionQuestionText`, or set it to: `"Archived French objective text not in supplied excerpt; conflict stated in /sourceDecisionQuestions/0."`

### Core 30: `sourceCompositionProvenance`
Add a clause so the Reader1 role is not merged with the picture role: `"Reader1's foreman is not equated with card:6 crew lead; picture B and picture A are separate classroom compositions."`

### Core 30: tie-off hold (`scopedInternalDecisionHolds[4]`)
Append: `"; no harness, anchor or tarp availability or readiness is implied."`

## Existing issues (internal flags only; leave the preserved values unchanged)

- **Core 28 opening.** The learner says "Here are the pictures." but `partnerRole` holds and displays all the pictures. The word-bank item "Where is the broom?" is never used.
- **Core 28 `newNotes` mapping.** The notes pair "card11 and Reader2, card13 and Reader3", but question /3's `affectedIds` are reader:3 and card:11.
- **Core 29 roles.** Both roles mention pictures, but the exercise uses word cards only. The new French roles mirror this faithfully, as parity requires.
- **Core 29 card:2 French mismatch.** The candidate "non terminé" differs from the conditional "inachevé", and the turn uses "n'est pas terminée". All of these remain unselected.
- **Core 30 `goalFrench`.** "Interrogez sur l'image…" has no object. "Posez une question sur l'image…" would be more natural.
