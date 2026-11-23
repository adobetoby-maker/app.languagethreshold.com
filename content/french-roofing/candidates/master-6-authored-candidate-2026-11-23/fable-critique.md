# Shared batch read-only critique

# Review of Master Roofing 4, 5, 6 (fr-en): correction proposals only

This is based on the pasted JSON alone. I did not check the packet files, hashes, archived French or the source audit commit, and nothing here is an approval. `heldDecisionRefs` match the held rows in all three lessons, register is consistently *vous*, and there is no ladder-setup or triage content.

## Master 4

1. **Unheld rows that depend on held content.** Card 19 and Reader 16 ("That's what the manufacturer asks for, and that's how we do it") point back to the held fictional-sheet steps and the "sheet rules" relationship. Either propagate the hold or add a scope note like the one on Card 15.
2. **"Homeowner" is handled inconsistently across lessons.** Reader 15 proposes "le propriétaire", while Master 5 holds "the homeowner" (card 14) for noun-sense review. Align them: hold the noun here or cite the same pending decision.
3. **The "After + -ing" pattern is attested only in held rows.** It appears in Readers 8 and 12, yet form 2 and the write activity are labelled "from exact unheld source vocabulary". Add that the pattern is new and not source-anchored. Form 1 should cite Card 15, the only unheld attestation of "Before + -ing".
4. **Card 12's headword may not be exact source.** The row gives "the step (in a procedure)", while the activities use "the step" and claim exact source. Confirm whether the parenthetical is source text or an added gloss; if it is a gloss, move it to `scopeNote`.
5. **The say sentence is illogical.** "Before reading the spec sheet, find the warning" asks for a warning that sits on the unread sheet. Proposed: "Before reading the step, find the warning." / « Avant de lire l'étape, trouvez l'avertissement. », which matches the speaking turn.
6. **The speaking scenario is incoherent.**
   - "Spec sheet" is listed as a heading inside the reference document, but the learner says "I'm reading the spec sheet".
   - The partner holds the document while the learner reads it.
   - The opening request for a moment is never used.
   - "find" is missing from the word bank.
   
   Proposed context: "The learner holds a spec sheet with a warning and numbered steps."
7. **Three items have gaps for qualified review.**
   - Recall and hear do not state where their French comes from; the hear French is a new composition according to candidate row 21.
   - "the manufacturer instructions" is exact source, but learners will produce "manufacturer's"; this needs a decision from qualified English review.
   - Card 15 "poser" is a trade-register choice pending trade review.

## Master 5

1. **Two unheld terms sit inside held content.**
   - "The extra day" (card 13, type activity) is named in the hold on cards 15–18, and its sibling "the extra cost" is held.
   - "The rotten wood" (card 2, hear activity) is the damage term every held sentence turns on, while "the photo of the damage" is held.
   
   Decide whether both inherit the holds. A lower-risk hear item is "the contract".
2. **The objective does not match the items.** It says "document terms", but rotten wood and extra day are not document terms. Reword the objective or swap the items.
3. **The write prompt is ambiguous.** « Écrivez en anglais : Écrivez le terme « the contract » ici » can be read as "write *the contract*". Proposed: « Traduisez en anglais la phrase : "Écrivez le terme « the contract » ici, s'il vous plaît." »
4. **Vocabulary is mentioned, not taught.** The say, write and speaking prompts already contain the English term, so only the request frame is practised and the meaning is never elicited. "The term 'the authorization'" (article inside the term) is also unnatural and needs qualified English review.
5. **Speaking anchors and context have errors.**
   - Card 13 is anchored but unused in the dialogue.
   - The context says the terms are already printed, yet the partner asks where to write one.
   - `closureEnglish` is "Thank you." but the final turn is the refusal "No, thank you."
6. **The supplement conflicts with its own hold text.** The hold on cards 15–18 says grammar, forms, speaking and six modes should be authored only after source and domain decisions. State explicitly that this supplement does not discharge that instruction.
7. **"le jour supplémentaire" needs a French check.** « La journée supplémentaire » is the likelier wording for work duration.

## Master 6

1. **"Is the color in stock?" mirrors a held row.** The collocation is attested only in held Reader 2 ("we don't have that color in stock"). The provenance should say so, or the object should change. The speaking context also gives no antecedent for "the color".
2. **The speaking anchors are wrong.** Card 8 (delay) is cited but unused. Cards 7 and 12 are used but not cited, and Card 3 is used. Card 16 is a pattern anchor only, since the dialogue line is the new "When will the order arrive?"
3. **Authoring notes leak into learner-facing fields.** `contextFrench`, `practiceContextEnglish` and `partnerRole` contain "nouvel exercice linguistique", "dans ce dialogue" and "newly composed". The context also gives away the partner's second cue. Proposed: « Vous appelez un fournisseur au sujet d'une commande. »
4. **"Time" is narrowed to clock time in French.** "arrival/delivery time" becomes « heure », while the objective speaks of a delivery date. Review « date/heure » or « moment de la livraison ».
5. **Form 1's French template has the wrong word order.** It says « Quand + sujet + verbe » but the examples invert. Proposed: « Quand + verbe au futur + sujet ? »
6. **The same sentence has two encodings.** "We're" has a straight apostrophe in the say activity and a curly one in form 2 and the speaking turns. Normalise across the file.
7. **Three reader rows need small fixes.**
   - Reader 1 « avec une mauvaise nouvelle » is a calque; consider « pour lui annoncer… ».
   - Reader 14 « près du » is weaker than "next to" (« à côté du »).
   - Reader 3 uses guillemets after the speaker label, while Master 4 Reader 16 does not.
8. **The hear item presupposes held content.** "When will the rest arrive?" assumes the partial delivery in held Card 15. It is acceptable as an isolated exact-source item only with the existing internal note.
