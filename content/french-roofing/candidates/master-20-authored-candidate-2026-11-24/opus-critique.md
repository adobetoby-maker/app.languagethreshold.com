# Review: master-roofing 19 & 20 (fr-en), pasted JSON only

These are read-only correction proposals. Nothing here is approved or selected, and I did not check any files or hashes. All source faces remain held. All French below is proposed for qualified review.

## Lesson 19

**1. Activity anchors point to unrelated source faces (provenance).** Four activities cite warranty-domain cards for vocabulary with no link to those cards:
- recall "the printed page" cites card:2 (final invoice)
- hear "The printed word is clear." cites card:3 (product warranty)
- type "the word list" cites card:4 (installation warranty)
- say "the heading" cites card:1 (final walkthrough)

"Thematic only" does not hold; there is no shared theme. *Proposal:* set `sourceAnchors: []` and relabel provenance as "New composition; no source anchor."

**2. Lexical proposals 1–3 propose answers for held warranty and invoice faces.** "la facture finale", "la garantie du produit" and "la garantie de pose" are French renderings of held cards 2, 3 and 4. "garantie de pose" versus "garantie d'installation" is itself a domain and locale decision. No activity uses these proposals. *Proposal:* remove proposals 1–3. Keep only proposal 4 ("la carte de visite"), as ordinary vocabulary that is proposed, not approved.

**3. Exact-face activity target.** The see activity's answer is held card:14 ("the business card"). The French prompt also shows "la carte de visite" to the learner, which effectively selects it. *Proposal:* relabel as an ordinary-vocabulary proposal with this provenance: "ordinary vocabulary coinciding with held card14; not a source-face answer." Otherwise, swap in non-source vocabulary. The same applies to "the business card" in the write activity and the speaking turns.

**4. Grammar note contradicts its example.** The grammar explanation says *as long as* expresses a "language task" condition. The example ("As long as the printed word is clear…") is a readability condition. The French objective ("conditions de lisibilité et de tâche de langue") repeats this split, but the English objective says "two readability conditions."
- *Proposal:* use "Use unless and as long as for conditions about whether printed text is legible" in both languages.

**5. French objective does not match the English objective.** The French says "Poser une question polie sur la lecture d'un mot imprimé." The English says "Offer to read a printed example." *Would you like me to…* is an offer.
- *Proposal:* "Proposer de lire un exemple imprimé et exprimer deux conditions de lisibilité avec unless et as long as." This matches the existing `goalFrench`.
- Also change the grammar explanation's "polite question about reading a printed word" to "polite offer to read."

**6. Inconsistent French glosses.** The grammar explanation glosses *as long as* as "tant que." The form and the expected turn use "à condition que." In this sense, "tant que" leans durational.
- *Proposal:* use "à condition que / du moment que" throughout.

**7. *Unless* turn is grammatical but awkward in both languages.** "Unless the printed word is clear, I will ask for another copy." and "Sauf si le mot imprimé est lisible, je demanderai…" both front the clause awkwardly.
- *Proposal (English):* "I will ask for another copy unless the printed word is clear."
- *Proposal (French):* "Je demanderai une autre copie, sauf si le mot imprimé est lisible."

**8. Scenario logic.** The context already provides two copies, one clear and one blurred. Asking for "another copy" makes little sense.
- *Proposal:* change the context to "a printed word that may be blurred," or have the turn say "…I will use the clear copy."

**9. Minor mismatches.**
- The hear prompt asks for an "expression… avec l'article," but the target is a full sentence. *Proposal:* "Écoutez la phrase anglaise, puis répétez-la."
- "the heading" is glossed as "le titre de section." *Proposal:* use either "the section heading" or "le titre."

## Lesson 20

**1. "Checklist" is used for something that isn't a checklist.** "the next word on the checklist", "printed word checklist" and "vocabulary checklist" are unnatural English, because checklists hold items to verify, not words to read. The French opening "la liste de contrôle de mots imprimée" is also awkward. "liste de contrôle" versus "liste de vérification" is a held locale decision.
- *Proposal:* use "the word list" in the scenario. Either keep "the checklist" only as a standalone vocabulary item, or use "the next item on the checklist."

**2. The *would* task's answer is already fixed by the context.** The context says "The practice page says to start with the shortest word." So "Which word would you choose first?" is not an imagined choice.
- *Proposal:* delete that context sentence, or change the cue to something like "If you could choose, which word would you read first?"

**3. French objective does not match the English objective.** The French adds "vocabulaire de la liste de contrôle" and "écrire des phrases," neither of which is in the English objective or the speaking-based goal.
- *Proposal:* "Employer une demande de lecture, une phrase au passé avec nearly et un choix de mot hypothétique dans une tâche de langue." This matches `goalFrench`.

**4. Unrelated anchor.** The type activity "the next word" cites card:10, but its provenance says it is new vocabulary.
- *Proposal:* set `sourceAnchors: []`.

**5. Exact-face targets (same issue as Lesson 19 finding 3).** The see (card10), recall (card4) and hear (card13) activities and the write term (card10) use held faces as answers, with the French shown in the prompts.
- *Proposal:* relabel these as ordinary-vocabulary proposals, not source-face answers.

**6. Minor issues.**
- "chacun de vous" would read more naturally as "chacun d'entre vous."
- Form 3 uses "base verbale," while the rest of the file uses "verbe de base." *Proposal:* "would + verbe de base : choix imaginé et poli."
- Form 2's example says "the list" while the speaking turns say "checklist." Align them after fixing finding 1.
- The hold text on activities and lexical proposals is boilerplate about warranty and insurance, which is irrelevant to this lesson. It is internal only, but could be trimmed.

## No issues found

- Role neutralisation is correct in both lessons.
- Gates are all false, and `selectedFrench` and `audioScript` are null.
- Spanish evidence is used as provenance only.
- No ladder, field-method, safety or triage content appears in learner text.
- Lesson 20 keeps harness, fall, weather and change-order content out of learner text.
