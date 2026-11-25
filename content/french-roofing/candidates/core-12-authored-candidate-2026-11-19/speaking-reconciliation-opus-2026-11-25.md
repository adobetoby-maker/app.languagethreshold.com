# Core 10–12 speaking/original-scope reconciliation: corrections

I couldn't verify hashes, pins or the crosswalk. Every point below is a suggested edit to `speaking`, the objective fields or notes only. Activities, forms, candidate rows and the dictionary stay as they are. Nothing here is a qualified approval.

## Core 10 (Tarp the Unfinished Roof)

1. **The objective implies a confirmation that never happens.** `candidateObjectiveEnglish` says "…then repeat the report for confirmation," but nobody confirms anything in the exchange. "Confirm" also points back to the held readback of the tarp plan (card9/11/12). Suggested wording: *"Read a printed weather/status report, then repeat and summarize it on request."*
2. **The roles say "coworker reporting," but the provenance says printed fiction.** The provenance says the opening is "read as printed source fiction, not as a forecast or work status." `learnerRole` ("A coworker reporting the wind…") and `partnerRole` describe a live site report. Also, `partnerRole` only mentions repetition, but the partner also asks for the location and a summary. Suggested roles:
   - Learner: *"A learner reading a printed fictional status report."*
   - Partner: *"A partner asking for repetition, the unfinished-section location and a summary."*
3. **The apostrophes don't match.** Candidate row reader:3, the recall activity and form:2 use a straight `'` ("à l'arrière"). `expectedLearnerTurnsFrench` and `expectedAllLearnerTurnsFrench` use a curly `’`. An exact-match validator would fail on this. Since the candidate face must not change, either switch the speaking French to the straight `'` or record the typographic normalization explicitly.
4. **The French summary has an unnatural comma.** "Il y a du vent, et il y a…" should be "Il y a du vent et il y a…". Make the change in both expected-turn arrays and keep the English comma.
5. **card:14 is anchored but not used.** No speaking turn uses "Repeat the plan to confirm." Anchoring it ties the exchange to "plan," which is held-dependent. Either remove `card:14` from `speaking.sourceAnchors`, or add a `sourceAnchorRoles` entry such as "related, unused; plan sense not imported."
6. **One internal note needs rewording (low priority).** "…despite the models not receiving that source array" exposes process detail and reads as a qualification. Suggested: *"Exact text is validated against pinned /sourceVerbExamples/4."*

## Core 11 (First-Course Layout)

1. **The objective says the learner measures, but the speaking doesn't.** "…check a measurement with the tape measure" means the learner performs a measurement. In the speaking, the learner names the tool and asks the partner to check. Suggested wording: *"Name the tape measure, ask whether a line is straight, and ask someone to check the measurement."* This matches `goalEnglish`.
2. **`partnerRole` promises a cue that doesn't exist.** It says the partner is "asking about the tool," but the learner gives the opening unprompted and none of the three cues asks about the tool. Keep three cues and change the role to *"Another coworker asking about a labelled example line and a measurement-check request."*
3. **The provenance for "check" is vague.** The core 11 cards have no "check" face. The only source is `/sourceVerbExamples/4`, "The foreman checks the measurement again," which carries the held foreman role (the same text as held reader:6). Pin it in the provenance: *"verb check from /sourceVerbExamples/4; foreman subject and 'again' not inherited."*
4. **The French practice context is ungrammatical and repetitive.** "Le partenaire demande une question… et une demande…" should read: *"Le partenaire fait formuler une question sur la rectitude de la ligne et une demande de vérification de la mesure, puis fait répéter cette demande."*
5. **The tape-measure term has an open locale question that the speaking doesn't flag.** dictionary:5 has `localeReviewPending` (ruban à mesurer / mètre ruban), but the speaking only flags the vous register. Add an `internalDecisionHolds` entry: *"Opening French 'ruban à mesurer' is subject to the card5 locale review."*
6. **A cue gives away its own answer (optional).** "How would you ask me to check the measurement?" contains the target wording. That's acceptable as scaffolding, but it should be marked as such.

## Core 12 (Joint Stagger)

1. **The objective contradicts the quote-only framing.** "…and say that the joints must not line up" asserts the rule, while the speaking provenance says the sentence is "quoted only, not adopted as a current work rule." Suggested wording: *"Ask what the stagger is for this job and quote the printed sentence 'The joints must not line up.'"*
2. **The source-question index is ambiguous.** `openSourceQuestionDependencies[0].sourceQuestion: 4` is 1-based, while core 10 uses 0-based JSON pointers (`/sourceVerbExamples/4`). Read as 0-based, it would point to the course/rang question. Add `"jsonPointer": "/sourceDecisionQuestions/3"`.
3. **The French goal doesn't match the French question.** `goalFrench` says "le décalage **de** ce chantier," but the question says "**pour** ce chantier." Use "pour" in both.
4. **The closing "Thank you" is pragmatically odd.** The learner thanks the partner right after re-asking a question nobody answered. Either have the partner's third cue acknowledge the question, or end on the question and move "Thank you" into a short separate closing line. Either way, the turn must not imply that the question was answered.
5. **The learner role implies a live job (low priority).** The context is a "printed sample-job question," but "A coworker asking…" suggests a real one. Align the role with the printed framing, as in core 10.

## Checks that passed

- All three lessons have three partner cues, each paired with a learner reply.
- The sequence arrays and the expected/all-turns arrays match in each lesson.
- `sourceObjectiveCompletionStatus` and `sourceSpeakingCompletionStatus` say "held and incomplete" in all three.
- No speaking turn supplies a stagger value, an inch value, a forecast, a tarp or tie-down method, a measurement result, a straightness verdict, departure clearance, or equipment readiness.
- The core 10 English "4:00 in the afternoon" and French "seize heures" match.
- Core 10 and 11 have empty `openSourceQuestionDependencies`. That's correct for their used anchors, apart from the card14 point above.
