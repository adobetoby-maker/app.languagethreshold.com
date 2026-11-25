**Verdict:** nothing blocking in Core 16–18, but there are eight concrete corrections, all confined to the speaking blocks and notes. This is from the pasted text only; hashes, the "exact prior draft retained" claims and the source arrays are unverified.

## Corrections, in priority order

1. **Core 18 `openSourceQuestionDependencies` is incomplete for `card:6` (depth).** By the same wording-inference rule used for the other entries, two more questions name depth:
   - `/sourceDecisionQuestions/0` ("must preserve the observable depth condition")
   - `/sourceDecisionQuestions/5` ("check depth on a few shingles")

   Add both with `affectedUsedAnchors: [card:6]` and scope "depth noun only; no diagnostic criterion or repair".

2. **Core 17 `openSourceQuestionDependencies` applies the rule unevenly.**
   - `/sourceDecisionQuestions/3` ("after confirming this product's instructions… product scope") is omitted; it touches `card:3` and `card:8` on the same basis as Q5.
   - Q1 names "product instructions" but lists only `card:3`, while Q5 lists both `card:3` and `card:8`. Add `card:8` to Q1 or state why it is excluded.

3. **Core 17 role and goal disagree.** `learnerRole` says "asking for a document label", but the opening and `goalEnglish` ask where the document is. The same error is in `learnerRoleFrench` ("demande l'étiquette d'un document") and `candidateObjectiveEnglish` ("ask where a document label is").
   - Suggested English: "A learner asking where a document is and reading word cards."
   - Suggested French: "Un apprenant qui demande où se trouve un document et lit des cartes-mots."

4. **Core 17 `reconciliationProvenance` makes a false claim.** It says "Practice context states card B is fictional", but `practiceContextEnglish` and `practiceContextFrench` say only that the actual document is not included. Either add "fictional"/"fictive" to both contexts or reword the provenance to match. The French also drops "actual" ("le document du fabricant" should be "le véritable document du fabricant").

5. **Core 18 goal reads as a label on equipment.** "Identify the compressor label" / "Identifier l'étiquette du compresseur" contradicts the cards-only context.
   - Suggested English: "Confirm the card that says compressor and read three word-card labels."
   - Suggested French: "Confirmer la carte portant le mot « compressor » et lire trois étiquettes de cartes-mots."

6. **Core 16 French parity and card type.**
   - `practiceContextFrench` drops "hypothetical"; it should read "une carte-image hypothétique représentant un seul clou".
   - It uses "La personne qui apprend" where `learnerRoleFrench` uses "Un apprenant"; pick one.
   - `learnerRole` says "word-card picture" / "carte-mot", but the card is a picture card everywhere else, and the spelling question only works if no word is printed. Change to "picture card" / "carte-image".

7. **Word banks are inconsistent across the three lessons.**
   - Core 16 has one "nail?" tile for two turns ("Is this a nail?" and "How do you spell nail?"). Add a second tile or declare tiles reusable.
   - Core 17 carries the unused lowercase tiles "product" and "number of nails", left over from the prior draft. Remove them or label them as distractors.
   - Core 18 is complete.

8. **Stale boilerplate in provenance fields.**
   - Core 17 `scenarioProvenance` still says "picture/word-card exchange"; there are no pictures (Core 18 was already fixed).
   - `sourceSpeakingCompletionStatus` in 17 and 18 says "picture/label exchange"; it should say "word-card label exchange".
   - The "Final Fable/source self-check: packaging distinction propagated, ordinary document-label sense scoped separately" note is copied into 16 and 18, where neither applies. Scope it to 17.

## Record, don't change

- **Form coverage:** the Core 17 speaking no longer uses form 1 ("This is a product."), and Core 18 uses only form 2. Since forms stay unchanged, add an internal note that the speaking covers a subset of forms.
- **Core 17 closing:** "Thank you." follows a stated need the partner has already said cannot be met. It is tolerable as a courtesy, but worth noting as unmotivated.
- **Core 16 dependencies:** the empty `openSourceQuestionDependencies` is defensible, but `heldRefsInterpretation` promises a separate listing. Say "none identified" explicitly.

## Checks that pass

- **Three cues and replies:** each lesson has seven alternating turns, and the expected, all-turn and partner-support arrays agree with the turn sequences in both languages.
- **Held refs:** complete against candidate rows (16: 14 cards + 8 reader; 17: 11 + 7; 18: 11 + 9).
- **Dependency entries:** the listed question texts match the source verbatim and the JSON pointers match their indices.
- **Units and values:** no count, pressure, depth value or setting appears anywhere.
- **Readiness and authorization:** no cue gives an equipment-readiness answer or a work or safety authorization. Core 18's "Yes, card A says compressor" stays label-scoped.
- **Objective status:** the original objective and speaking mission are marked held and incomplete in every lesson.
- **Approval:** all gates are false, `selectedFrench` and `audioScript` are null, and the French register is consistently vous.
