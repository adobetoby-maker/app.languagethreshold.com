# Critique: French Roofing Core 13–15 speaking/original-scope reconciliation

This is a read-only critique of the pasted text. I used no tools, opened no files and verified no SHA pins. None of this is a qualified review or an approval. The corrections below touch only speaking-block and status fields. Source faces, activities, forms, candidate rows and dictionary mappings stay as they are.

## Cross-cutting (13, 14, 15)

1. **The French role fields don't match the English.** All three lessons share one generic `learnerRoleFrench` and `partnerRoleFrench`, but the English roles differ per lesson. Core 14 is the worst case: English says the partner is "asking for item names", while French says the partner "montre les étiquettes et propose les répliques". The fix is to align the English to the generic French, not the other way round. "Coworker" points toward a work-role scenario, which conflicts with the label-only scope.
   - Learner: "A person practising requests and nouns with cards or a hypothetical sketch."
   - Partner: "Another person who shows the labels and gives the exercise cues."
2. **`heldRefsInterpretation` promises something the data doesn't deliver.** It says "used-face source questions are separately listed", but `openSourceQuestionDependencies` is `[]` in all three lessons. Either populate the list (see 13.4, 14.4, 15.3) or reword the interpretation to "none of the used faces' IDs appear in any `sourceDecisionQuestions.affectedIds`". As written, the claim is wrong for Core 15.
3. **Objective status needs no change.** `sourceObjectiveCompletionStatus`, `sourceSpeakingCompletionStatus`, `holdReason` and the gates all keep the original objective explicitly incomplete. No turn supplies a sequence, placement, value, product or authorization.

## Core 13

1. **`candidateWordBankEnglish` contains a partner line.** The learner never says "Corner C1."; only the partner does. Replace it with "Thank you, that is clear." or just drop it.
2. **The opening depends on the lead-in, which sits outside the turns.** "Which corner do you mean?" only makes sense after "Please look at the corner." If the runtime shows `practiceContext` and `turnSequence` only, the paraphrase ("The partner first mentions a corner…") is barely enough. Quote the lead-in in `practiceContextEnglish`/`French`, for example "The partner says: "Please look at the corner."", so the cue chain is self-contained without changing the 7-turn count.
3. **The cue and reply chain is coherent.** No edge-at-corner placement is implied, so no change is needed.
4. **Consider adding a dependency.** The `corner` labels touch the source question on card:13/reader:7 (corner detail). Listing it in `openSourceQuestionDependencies` would document that "corner" is label-only here.

## Core 14

1. **Card and item references don't match.** The context says "Card A **says** roll", but the partner asks "What is **item** B called?" and the learner asserts "This **is** a roll", which treats a word card as an object. Use pictures in both the context and the cue, and avoid real objects so nothing reads as equipment on hand:
   - EN context: "Picture A shows a roll. Picture B shows a fastener. Card C says manufacturer instructions."
   - FR context: "L'image A montre un rouleau. L'image B montre un élément de fixation. La carte C porte l'expression « manufacturer instructions »."
   - Cue 1: "What is in picture B?" / « Qu'y a-t-il sur l'image B ? »
2. **The final reply could be read as a document check.** The learner asks "Where are the manufacturer instructions?", the partner points to a label, and the learner says "Thanks, that helps." Next to a source speaking objective of "verify against the selected product instructions", that can read as the instructions having been located or consulted. Make it explicit that the learner is reading a label:
   - Cue 3: "Card C has that label. Please read the card." / « La carte C porte cette étiquette. Lisez la carte, s'il vous plaît. »
   - Keep the learner's reply as is.
3. **The French register is inconsistent.** « Vous avez besoin d'autre chose ? » is an informal declarative question, while the rest of the lesson uses inverted *vous* forms. Use « Avez-vous besoin d'autre chose ? ». Also, « Veuillez la lire » is stiffer than "Please read it"; the change in item 2 already replaces it.
4. **Consider adding a dependency.** card:9 "manufacturer instructions" is the term at issue in the source question on reader:5/6 (the guide's six inches versus the manufacturer's instructions). Listing it would block any reading of the Card C label as verification.
5. **Units are fine.** "inch" appears only as a unit word, with no number in speaking. The six-inch phrase stays held.

## Core 15

1. **`closureProvenance` is factually wrong.** "Exact source width question" is false: the source has only the noun `width` on card:6, and the matching write activity calls the question a "New width question from source noun". Correct it to: "New composition from source width noun; open question, unanswered; no value, courtesy or confirmation appended."
2. **Cue 3 doesn't fit the reply.** The partner asks "What dimension do you want to ask about?", and the natural answer is "The width.", not a question. Change cue 3 so the learner's question is the reply:
   - EN: "Do you have a question?"
   - FR: « Avez-vous une question ? »

   The open ending (`endingType`, `widthQuestionStatus`) can stay.
3. **`openSourceQuestionDependencies` should not be empty.** The faces the lesson uses are named in source questions:
   - The question on card:12/13/reader:4/6 says "Confirm **adhesive/backing**… terms". That covers cards 4 and 5.
   - The question on card:14/reader:3 says the source "does not state a measured length or **width**". That covers card 6.
   - The question on card:2/10/reader:5 is already linked from card 3 through `linkedProductDecisionRef`. That covers the membrane.
4. **The practice context has an internal note and a deixis gap.** The English sentence "Yes confirms only the printed label on card C; it is not a product identification or handling decision." is internal hold text inside a learner-facing field, and it has no French counterpart. Move it to `internalDecisionHolds`. In its place, add a neutral pointer to both languages so "this" has a referent: "The learner points to card C." / « La personne qui apprend montre la carte C. »
5. **The word bank lists a line the dialogue never uses.** "This is the adhesive." comes from form:2 only. Remove it, or keep it and mark it as form-only.

## No change needed

- The French support turns match the English in all three lessons.
- The `expectedAllLearnerTurns*` arrays match the turn sequences.
- The 7-turn counts match the internal notes.
- No turn carries a time, unit value, sequence, product, readiness or safety claim.
- The prior drafts are preserved unchanged.
