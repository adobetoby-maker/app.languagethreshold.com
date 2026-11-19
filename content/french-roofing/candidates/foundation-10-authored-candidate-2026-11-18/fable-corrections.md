Read-only review of the pasted JSON for both lessons. I had no access to the two `decision.json` packets, so `sourceEnglish` rows are taken as given and the hashes are unverified. Nothing here is an approval.

## Foundation 9

**Material**

1. **Held-sense leakage in `candidate:reader:1`.** The source "Excuse me, I'm coming through…" is rendered "Pardon, je passe avec l'échelle." "Pardon" is one of the unresolved alternatives in held card 4 ("désolé, pardon"), and card 3 already gives "excusez-moi" for the to-pass sense. Internal note 6 records the variance but not that it draws on a held row.
   - Proposal: use "Excusez-moi, je passe avec l'échelle." until card 4 is resolved.

2. **`form:1` meaning does not match its example.** `meaningFrench` is the card 9 gloss without "s'il vous plaît", while the example is Reader 2 with "please". It also glosses a sentence, not the form.
   - Proposal: `meaningFrench` "Pouvez-vous + infinitif ?", with the example gloss "Pouvez-vous me passer le marteau, s'il vous plaît ?" kept separate.

3. **`form:2` is misaligned three ways.** The form is "wait", the meaning is "Attendez ici." and the example is "Wait here, please." The provenance calls "wait" a "new reduced form", but "wait" is exact card 6; the new reduction is "Wait here".
   - Proposal: form "wait" → "attendez", example gloss "Attendez ici, s'il vous plaît.", provenance "card 6 exact; example exact card 11/Reader 5".

4. **French grammar text diverges from the English.** "Ajoutez please à la fin" reads as obligatory, where the English says "to sound more polite". It also omits "here", "Excuse me" and "Thank you", which the English teaches.
   - Proposal: "Ajoutez please à la fin pour être plus poli", and either add the missing points or trim the English to match.

**Minor**

- **Unlabelled new reductions.** "Wait here." in the English grammar text, and "wait here", "come here", "can you pass me" in the word bank carry no new-composition label. Only the type activity has one.
- **Anchor gaps.**
  - The speaking opening is exact Reader 2 but `line:2` is not anchored.
  - "Come here" is attested inside `line:4`, which the type activity does not cite.
  - `form:3` uses "here" without citing card 8.

## Foundation 10

**Material**

1. **`partnerCueFrench` is tautological and adds an unsourced domain gloss.** "Inspection veut dire inspection : on vérifie le travail." does not mark which word is English. "On vérifie le travail" is not in the source, and the only source inspection context is held Reader 2 (fall protection).
   - Proposal: "Le mot anglais « inspection » veut dire « l'inspection »." and drop the gloss.

2. **The write prompt has the same ambiguity.** In « Que veut dire inspection ? » the mentioned word is not marked as English.
   - Proposal: « Que veut dire le mot anglais "inspection" ? »

3. **The new composition pre-empts held Reader 7.** "What does inspection mean?" is correctly labelled new in the write activity and `form:2`. It is unlabelled in both grammar explanations and in the speaking goal and word bank. The lesson now centres on a third option (asking about an English word) while the caída/chute adaptation decision is still open.
   - Proposal: label it everywhere it appears and reference it in the Reader 7 hold, so the decision-maker sees it.

4. **Register note is inaccurate.** The internal note says intonation questions are "consistent with the polite-request lesson", but Foundation 9 uses inversion ("Pouvez-vous…"). Card 12 here uses intonation ("Vous parlez anglais ?").
   - Proposal: use "Parlez-vous anglais ?" or correct the note to say only "vous" is consistent and the question form varies.

5. **`form:1` gloss is wrong.** "question avec vous" describes neither "do" nor the pattern; "you" is not only "vous".
   - Proposal: "question au présent : do + sujet + verbe de base".

6. **French grammar text drops the scope.** "Utilisez do ou does avant le sujet et le verbe à sa forme de base" omits "in questions" and parses ambiguously.
   - Proposal: "Dans une question, placez do ou does avant le sujet ; le verbe reste à la forme de base."

7. **`senseNote` on the type activity is an internal note in an unmarked field.** Other notes use `internalSenseNote`, `derivationNote` or `internalCorrectionNote`.
   - Proposal: rename it to `internalSenseNote`. If disambiguation is wanted for the learner, put it in the prompt, for example « l'urgence (situation) ».

**Minor**

- **Article handling is uneven.** "safety" is made article-free with a note. The same reasoning applies to "the construction" and "the protection", which the source uses bare in Reader 1 and Reader 2, yet they have no note.
- **"Dans la construction" is locale-dependent.** France tends to say "dans le bâtiment". This row is not held or noted for regional review.
- **Reader 3 shifts the lexical item.** "Une personne de l'équipe" for "coworker" is gender-neutral as noted, but moves from coworker to crew member. This is for qualified French to confirm.

## Both lessons

- **Internal status in learner prompts.** The hear prompt "Écoutez le texte anglais proposé" exposes candidate status, and "texte" is odd for the single word "the hospital".
  - Proposal: "Écoutez la phrase anglaise" / "Écoutez le mot anglais".
- **Prompt voice.** The recall prompts use "Dites-moi…", while all other prompts are impersonal.
  - Proposal: "Comment dit-on « … » en anglais ?"
- **Form glosses are inconsistent.** `forms[].meaningFrench` glosses the example sentence in Foundation 9 and the form in Foundation 10. Pick one convention.
- **English terms are unmarked in the French grammar text.** "Utilisez Can you + verbe…" and "I need help signifie…" need guillemets or italics.

## Checked with no finding

- No ladder setup method appears in either lesson.
- No triage or emergency-number decision is selected; the 911 rows stay held and unused.
- Held Foundation 9 cards 4 and 5 and Readers 3 and 6 are not used in activities, forms or speaking, apart from the "Pardon" issue above.
- "Be careful." comes from card 10, not from the held rows.
- The exact-provenance claims for Foundation 9 `form:1` and `form:3` and Foundation 10 `form:1` and `form:3` match the pasted rows.
- The Foundation 10 closure's cross-lesson provenance is correctly labelled.
- All gates are false, and `reviewed` and `scoringEnabled` are false throughout.

Source-grounded self-check applied form/example sense separation, to-pass French alignment, courtesy/source anchors, explicit English-word adaptation provenance, grammar scope, prompt voice and internal-note placement. All qualified review and selection gates remain false.
