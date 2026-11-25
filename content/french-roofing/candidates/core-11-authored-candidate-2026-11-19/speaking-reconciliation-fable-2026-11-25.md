**Verdict:** I found no safety/work authorization, readiness answer, stagger value, unit or straightness verdict in any of the three speaking blocks, and all three state the original objective and source speaking as held and incomplete. The corrections below are needed before this is coherent; all are confined to `speaking` and notes. This is from the pasted text only: hashes, crosswalks and "arrays unchanged" claims are unverified.

## Core 12

1. **Stale word-bank chip.** `candidateWordBankEnglish` still contains `"Thank you."`, but no learner turn uses it now that the closure is the question. Remove it.
2. **Provenance contradicts `closureProvenance`.** `provenance` says "Restate-question cue and closure are new practice language", while `closureProvenance` says the closure is exact source card12. Change to: all three cues and the frame "The printed sentence says," are new compositions; the closure is exact card12.
3. **Cue 3 duplicates cue 1 and doesn't match the goal.** The learner says the same question in three of four turns, and nothing marks it as "unanswered", which is what `goalEnglish` and `goalFrench` claim. Replace cue 3 with "Which question is still unanswered?" / « Quelle question reste sans réponse ? ». The reply and closure stay unchanged.
4. **Goal parity.** `goalFrench` drops "printed" from the question, adds "sur ce chantier", and uses "reformuler" (rephrase) for a verbatim repeat. Use « Poser la question imprimée sur le décalage, citer la phrase imprimée et reposer la question restée sans réponse. » Change English "restate" to "repeat" for the same reason.
5. **Context parity and jargon.** `practiceContextEnglish` says "a separate source sentence about joints", while `contextFrench` says « une phrase distincte du texte sur les joints », which can be read as "from the text about joints". Use "a separate printed sentence about joints" / « une phrase imprimée distincte au sujet des joints ».

## Core 10

1. **Role conflicts with the fiction framing.** `learnerRole` is reading a printed fictional report, but cue 1 says "Please repeat your report" / « votre compte rendu » and the goal says "Report the wind…". Both attribute a real status report to the learner. Change them:
   - Cue 1: "Please read the first line again." / « Veuillez relire la première ligne. »
   - Goal verb: "Read aloud…" / « Lire à voix haute… »
2. **Summary is a bare assertion.** Core 12 attributes its printed sentence; Core 10 does not. Make reply 3 "The report says it is windy, and there is an unfinished section at the back. Thank you." and update the French, word bank and `expectedAll*` arrays to match.
3. **Reply 3 is unlabelled.** `provenance` covers the cues and closure but not the summary reply, which is a new composition (shortened reader:1 plus reader:3). Add that, and replace the ambiguous "Second turn" with "reply to cue 2".
4. **Cue 2 doesn't match the role or the reply.** `partnerRole` and both context fields say the partner asks for the *location*, but the cue is "Which section is unfinished?", which the exact reader:3 sentence does not answer. Change the cue to "Where is the unfinished section?" / « Où se trouve la partie inachevée ? ». The reply stays exact.
5. **Goal order is wrong.** The goal says "report wind and section, then repeat those facts", but the actual sequence is wind, repeat wind, section, summary. Reword both goals to that order.
6. **French ambiguity and addition.** « scène fictive imprimée sur le temps et l’état du chantier » has two problems: « le temps » is ambiguous next to « seize heures », and « du chantier » is not in the English. Use « sur la météo et l’état d’avancement » (matches the card:3 candidate), or add "site" to the English.
7. **Apostrophe mismatch.** Speaking has « à l’arrière » (curly); the unchanged reader:3 `candidateFrench` and recall activity have « à l'arrière » (straight). Match the row's straight apostrophe in speaking, or any exact-match validator will fail.
8. **Card14 status.** `provenance` calls it "related support only"; `internalDecisionHolds` calls it "related unused evidence". Keep "unused".

## Core 11

1. **Stale role.** `learnerRole` is still "A coworker… checking a line description", while `partnerRole` and the context are now "practice partner" / "Two learners", and no description is checked. Use "A learner naming a pictured tape measure and asking about a drawn line."
2. **Wrong boilerplate.** `sourceSpeakingCompletionStatus` says "printed-language practice", but this lesson uses a picture and a drawn line with nothing printed. Use "picture-prompt language practice does not complete original source mission".
3. **Empty dependency list reads as "nothing pending".** `openSourceQuestionDependencies: []` is correct against the packet questions. But `heldRefsInterpretation` promises that pending items on used unheld faces are enumerated, and two used anchors carry candidate-level flags:
   - card:11 has `senseDecisionPending` linked to card:1.
   - card:5 has `localeReviewPending`.
   
   Add a separate candidate-level pending list for these, or reword the interpretation.
4. **"Please" is unattributed.** Core 11 source has no "please", and the activity and form use the bare "Check the measurement." Label "Please" as a new courtesy addition in `provenance`.
5. **Cue 1 elicits a real question that is then ignored.** Reframe it as meta, like cue 2: "What would you ask about the drawn line?" / « Que demanderiez-vous au sujet de la ligne tracée ? ». The unanswered "Is the line straight?" then reads as an example, not a request for a verdict.

## All three

- `internalNotes` says "Speaking-only reconciliation", but `candidateObjectiveEnglish` was also rewritten (the prior value is retained). Say so in the note.

## Checked clean

- `heldDecisionRefs` equals the set of candidate-level held rows in each lesson.
- The Core 12 open-question entry matches packet `/sourceDecisionQuestions/3` in text and affected anchors.
- The Core 10 and Core 11 word banks assemble every learner turn.
- Core 10 time (4:00 in the afternoon / seize heures) is consistent, and no inch or six-inch content appears in Core 12 speaking.
- Core 11 `/sourceVerbExamples/4` is the *revisar* "check" row, and Core 10 `/sourceVerbExamples/4` is the exact "We repeat the plan to confirm."
