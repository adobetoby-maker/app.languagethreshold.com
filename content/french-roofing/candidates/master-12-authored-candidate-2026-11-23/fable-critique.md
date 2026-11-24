**Review of pasted JSON only, lessons 10–12.** No files, hashes, the OSHA URL or "exact archive evidence" claims were checked; "exact source" was compared only against the pasted `sourceEnglish` rows. These are proposals only, with no edits and no approval.

**What holds up:** no held `sourceEnglish` text appears in learner strings, and `heldDecisionRefs` matches the held rows in all three lessons. Nothing assumes a ladder setup method or a triage decision. The exceptions are the audience and scope problems below.

## Cross-cutting
1. **Internal anchors in learner text.** Cues, objectives and contexts cite "card 16", "card 17", "card 19", "fiche 16", "card16/card19" and "source cards". Replace them with descriptions such as "the explanation card" or "the future sentence".
2. **Crew-lead term drifts.** French uses "le responsable" (10 and 11 context) and "chef d'équipe" (11 goal, 12 context). "Le responsable" is also the candidate for 12 card 9 "the manager" and sits next to 10 card 14. Use "chef d'équipe" for the role and send card 9 to sense review (gérant/directeur).
3. **Duplicate provenance for the same French.** In 11, "épuisement dû à la chaleur" and "coup de chaleur" are labelled "New direct terminology proposal" in `clinicalTerminologyProposals` but "Exact unapproved archive evidence" in `terminologyProposals`. Only one can be right.
4. **Stale notes.** The "fall-protection" note is irrelevant to all three lessons, and the last internal note is duplicated in each. "French from card:N conditional" is undefined.

## Lesson 10
1. **Scope overclaims.** It says "two accounts, turn taking, respect and agreement", but only one account is reported (card 15 is held) and no activity or turn practises the other three. Narrow the scope to match the objective.
2. **Unused anchor.** "One at a time, please." (card 17) is in the word bank and `sourceAnchors` but in no turn. Add a cued reading or drop both.
3. **Duplicate activity.** `see` and `type` both target "the task". Swap one for an unused candidate such as "the agreement".
4. **Form 2 loses its grammar point.** Cutting "When Rogelio arrived," removes what makes the progressive "background". Reader:3 is unheld, so use the whole sentence.
5. **Form 1 gloss drops "to me".** "a expliqué que" should be "m'a expliqué que".
6. **"wet" → "humide" weakens the meaning.** Propose "mouillé". Also for the French reviewer: "sombre" versus "noir/nuit", and "grenier" versus "combles" by locale.
7. **Grammar explanations lack quotation marks** around the English forms, so the French one reads as a mixed-language sentence.

## Lesson 11
1. **Partner role contradicts the exchange.** `partnerRole` is "tired crew member" (the held source scenario), but the context and cues are a language partner quizzing on a story. Align with lesson 10.
2. **Objective confuses roles.** The learner is the crew lead, yet "Repeat the crew lead's acknowledgement" means Rogelio's. Name Rogelio. In `goalFrench`, "la reconnaissance du chef d'équipe" reads as gratitude.
3. **Scope conflicts with turn 2.** The scope says it sets no water supply, but the learner says "There will be cold water in the cooler all day." Reword the scope as "quoted as a grammar example".
4. **French-only disclaimer.** "Non de plan de chantier" is an internal note inside learner grammar text and has no English counterpart.
5. **Write task does not lead to its answer.** "La semaine a été difficile" does not yield "it's been a tough week", and form 2's own gloss says "cela a été une semaine difficile". Use "ça a été une semaine difficile/dure" throughout, and state that 's = has.
6. **Form labels are off.** "will be (future state)" is illustrated by existential "There will be", and "I know it's been + a tough week" is not a pattern. Propose "there will be + noun" and "it's been + noun phrase".
7. **Turn 3 is not an exact span.** "There are still three days to go." is recapitalised and drops "and"; label it adapted.
8. **Reader:4 French drops "still".** Add "encore" to match the turn and the form gloss.
9. **Cue 1 leans on a held row.** "Tell the crew" comes from held reader:3. Use "What does Rogelio say first?"
10. **Unmarked fields.** `plainMeaningEnglish` on held cards 2 and 3 has no internal-only marker. Dictionary:17 lacks the "eau froide/fraîche" provenance note that the candidate row carries.

## Lesson 12
1. **Audiences are merged despite the disclaimer.** Opening with "Sorry to bother you, ma'am." and then giving the card 19 notice to the same partner combines a homeowner phrase with a manager phrase. The objective ("one plain message with a courteous tone") says the same. That audience split lives in held reader:6, 8 and 9. Use a neutral new opening and read the two cards under separate cues.
2. **Cue 2 and its answer do not match.** It asks what Kevin wants to know, but the answer adds "and Rogelio explains it to him with an example". Trim the answer (labelled span) or ask for the whole sentence.
3. **Reader:1 French loses meaning.** "Lui donne un exemple" drops "explains it"; propose "le lui explique à l'aide d'un exemple".
4. **Turn 3 repeats turn 1.** Use it for the courtesy card instead.
5. **Duplicates and unused items.** `type` and `say` both target "the request", and `say` omits the article instruction. "The request" is in the word bank but in no turn, and "the courtesy" is in scope but unpractised.
6. **French fixes a register the scope disclaims.** Forms 1 and 2 hard-code vous ("excusez-moi de", "je vous informe que") for register-neutral English. "Je vous informe" is also more formal than "I'm letting you know"; consider "je vous signale/préviens". Card 19's vous depends on held reader:8 and is not marked.
7. **Sense checks.** "The rudeness" → "l'impolitesse" against "la grosería" suggests "la grossièreté". The held card 15 option softens "rotten" to "dégradé" and mixes "Regarde" with formal "nous".
8. **Wording and parity.** Form 3 provenance "whole exact English meaning" is unclear. `contextFrench` omits the English audience sentence, which is an internal note and should leave learner text anyway.
