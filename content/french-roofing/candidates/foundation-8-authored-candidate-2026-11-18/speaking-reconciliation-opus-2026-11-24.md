# Critique: Foundation 7–10 speaking and original-scope reconciliation

These are concrete corrections only. They touch speaking-block fields and provenance strings. The existing candidate faces, activities, forms, dictionary rows, IDs and pins stay as they are. Nothing here is approval: every gate stays false.

## Foundation 7

1. **Cue 2 asks to repeat something never said.** "Can you repeat the question about stopping?" comes before the learner has asked the stopping question.
   - Change it to: "Now ask the question about stopping." / "Maintenant, posez la question sur l'arrêt."
   - Update `practiceContextEnglish` and `contextFrench` to match: one repetition request, one new prompt, then both questions together.
2. **The reason-question provenance is wrong.** The provenance says "source card12/line7". Only line7 is exact ("…at eleven?"). Card12 is the base question without the time.
   - Change it to: "the reason question is exact source line7; card12 is the same question without the time anchor."
3. **The opening provenance lost a detail.** The prior draft correctly said "Excuse me," is newly authored. The new text calls it "the existing candidate opener" and drops that.
   - Restore it, and add: "attention-getting sense, not Foundation9 card3 'excuse me (to pass)'."
4. **`holdReason` leaves out one source element.** The source speaking task includes "when you start", and no source row covers it.
   - Add: "Start-time question has no source row and is uncovered."
   - Also state the count: the speaking covers 2 of the 5 required questions.
5. **The roles contradict the context.** The roles say "crew member" and "coworker", but the context is two learners with a printed sheet.
   - Change `partnerRole` to "A practice partner who asks the learner to repeat or combine the questions."
   - Change `learnerRole` to "A learner practicing…"

## Foundation 8

1. **Cue 1 asks something already answered.** The learner opens with "The roof isn't ready yet." The partner then asks "Is the roof ready?", and the learner repeats the same line. This also duplicates a turn in `expectedAllLearnerTurns*`.
   - Change cue 1 to: "Can you repeat that, please?" / "Pouvez-vous répéter, s'il vous plaît ?"
   - Or drop the opening so that cue 1 asks the question.
2. **Cue 3 doesn't match what came before.** "…again in full sentences" is wrong because both earlier replies were already full sentences.
   - Change it to: "Can you say both answers together?" / "Pouvez-vous dire les deux réponses ensemble ?"
3. **`learnerRole` contradicts the no-readiness-answer constraint.** "reporting readiness" implies a readiness judgment.
   - Change it to: "A learner reading from the printed account that the roof is not ready yet and the wheelbarrow is empty."
   - Align `partnerRole` with the printed-account practice partner, as in Foundation 7.
4. **One provenance phrase is unclear.** "readiness device" doesn't mean anything specific.
   - Change it to: "not a readiness, roof-access or equipment determination."
5. **Make the incomplete objective explicit.** `provenance` should say what `holdReason` says: the not-ready item is covered; the harness rule and "ask for more material" are not; the original objective is incomplete. The empty wheelbarrow is a substitute and is not part of the source task.
6. **The word bank can't build turn 3.** It has "There's nothing", but turn 3 uses "there is nothing".
   - Either add "there is nothing", or make turn 3 use contractions: "The roof isn't ready yet, and there's nothing in the wheelbarrow."

## Foundation 9

1. **The partner role has a logic slip.** "hands over one hypothetical hammer" describes handing over something that doesn't exist. It also conflicts with "language-practice partner".
   - Change it to: "A practice partner who hands over a hammer prop."
2. **The French context assumes a gender.** "pendant qu'il recopie son nom anglais" assumes a masculine learner, and "son" is ambiguous. This project already holds désolé for speaker-gender reasons.
   - Change it to: "…demande au partenaire d'attendre le temps de recopier le nom anglais de l'outil."
3. **The goal has the same gender issue.** `goalFrench` says "remercier le collègue"; use "remercier votre collègue".
4. **Fix the closing punctuation.** Change "No. Thank you." / "Non. Merci." to "No, thank you." / "Non, merci."
5. **The incomplete-objective statement is already correct.** It records one tool, no ladder instructions, and the objective as incomplete. No change needed.

## Foundation 10

1. **The French turns ask about a French word.** "inspection" is also French, so "Que veut dire inspection ?" reads as asking the meaning of a word the learner already knows.
   - Change it to: « Que veut dire le mot anglais "inspection" ? »
   - Likewise: « J'ai besoin d'aide pour le mot anglais "inspection". »
2. **Cue 1 French says more than the English.** "Pour quel mot avez-vous besoin d'aide ?" assumes the help is about a word; the English "What do you need help with?" does not.
   - Change it to: "Vous avez besoin d'aide pour quoi ?"
3. **The gloss needs wording fixes.**
   - English: add articles, "Inspection means an examination or a check."
   - French: put the embedded English in quotes, « examination » ou « check ».
   - "examen" carries a medical-exam sense next to the ambulance and hospital cards. Prefer "contrôle ou vérification".
4. **The context invites a real-work reading.** "on the jobsite" and "in context" suggest the held line2 fall-protection inspection.
   - Change it to: "In a language practice exchange, you ask a practice partner for help with an English word."
   - Mirror the change in `contextFrench`. Also change "un collègue / le collègue" to "votre collègue".
5. **The closure provenance regressed.** "Thank you" is not in this source packet. Restore the prior draft's reference: "Reuses Foundation9 card2; crossLessonCourtesyRef foundation-roofing:9:fr-en:card:2."
6. **Make the incomplete objective explicit.** Add to `provenance`:
   - The accident report is not done. The source says "on the roof", while line3 says "on the ladder", so that mismatch is held too.
   - The Spanish→English cognate direction is unresolved.
   - The original objective is incomplete.

## Cross-cutting

- **Apostrophes are inconsistent.** Straight `'` and curly `’` are mixed within and across fields, for example in Foundation 9 `expectedAllLearnerTurnsFrench` and Foundation 10 "J'ai" vs "J’ai". Normalize to one form before any matching or scoring work.
- **Role naming is inconsistent.** The `partnerRole` / `learnerRole` wording ("crew member", "coworker") conflicts with the practice-partner framing in all four lessons. Use one convention, such as "learner" and "practice partner", so no turn reads as real jobsite direction.
