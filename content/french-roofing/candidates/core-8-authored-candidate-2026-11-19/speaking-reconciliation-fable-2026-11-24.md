**Verdict:** the three speaking blocks hold the boundaries (no readiness answer, no safety or work authorization, `qualifiedApproval: false`, 3 cues / 3 replies / 7-turn sequences all consistent), but need the corrections below. This is from the pasted text only; hashes and "unchanged" claims are unverified. No time or unit claims are introduced.

## Priority 1: scope and provenance

1. **Core7 speaking anchors sit on an open source question.** `card:15` and `reader:9` ("Is that clear?") are in the `affectedIds` of source question 6 (command vs. archived confirmation ask), yet `heldDecisionRefs` omits them and the rows show `hold: null`. Add a speaking-level field naming question 6 and those two anchors, and state that the tool-name use of "Is that clear?" is not the source's scope confirmation.
2. **The same gap exists for unheld rows in the other lessons.** Core8 Q5 covers `reader:7`; Core9 Q6 covers `card:11` and `reader:5`; Core9 Q5 covers `card:5`. The generic `heldRefsInterpretation` sentence does not enumerate them; list them per lesson in the speaking block.
3. **Incompleteness wording conflates objective and speaking task.**
   - Core8 `holdReason` calls "stop-worker and request-repair" the objective. That is `sourceSpeakingEnglish`; the objective is "Ask workers to prevent and report deck damage".
   - Core9 `holdReason` calls the "shingle and old-nail assignments" the objective. The objective is "Coordinate debris removal and deck cleanup".
   - Name both as incomplete in each `holdReason`, and add a speaking-task status alongside `sourceObjectiveCompletionStatus`.
4. **Core9 `internalNotes` misparaphrases the source.** "Assigns shingle and old-nail removal" should be "assigns shingle collection and old-nail pulling".
5. **"Existing opening" in Core7 and Core8 provenance reads as source-exact.** Both openings are new compositions (per the prior draft's `openingProvenance`), and their French is new, not archived. Reword to "prior-draft opening, new composition from card 8 / card 7 headword; French support new".
6. **Core8 legacy-ref defect is buried.** The `roofing:7:*` collision is noted only in `speaking.internalDecisionHolds`. Lift it to lesson-level `internalNotes` as a blocker for saved-item and progress mapping.

## Priority 2: cue and reply coherence

7. **Core7 cue 2** "A pry bar. OK." already acknowledges, so "Is that clear?" is unmotivated. Change it to "A pry bar." / « Un pied-de-biche. »
8. **Core8 context contradicts cue 2.** The context (EN and FR) says the partner "asks which image"; the cue is a yes/no question. Either change the cue to "Which image do you want to see again?" and drop "Yes." from the reply and word bank, or change the context to "asks whether".
9. **Core8 `partnerRole`** says "asking which label to check"; no cue does that. Replace with "offering to show an image again".
10. **Core8 cue 1** is clumsy. Use "What does the second card show?" / « Que montre la deuxième carte ? »
11. **Core8 artifact naming drifts** between "image cards", "sample-image card" and "sample cards". Use "image card" throughout. "Please show me the panel." should be "the panel image" to match the goal and the partner's reply and avoid reading as a physical panel.
12. **Core8 word bank** lists "This is a panel." twice.
13. **Core9 `partnerRole`** omits the third cue and says "has the shovel". Use "uses the shovel, and what the printed reminder says".

## Priority 3: French parity and roles

14. **Core9 `contextFrench`** quotes the reminder in French only, implying a French printed text. Use: « Put on your gloves » (Mettez vos gants).
15. **Core7 cue 3 French** « j'ai maintenant le nom » is awkward; use « j'ai bien noté le nom ».
16. **Core9 `goalFrench`** « rappel des gants » should be « rappel concernant les gants ».
17. **Role labels conflict in all three.** `learnerRole` says "coworker" while the context says "two learners". Use learner/practice-partner so no job-site role is implied.
18. **Apostrophes are inconsistent.** Core9 uses a curly one ("That’s all.") and Core7 a straight one ("You're welcome."). Normalize before any exact-match use.

The Core7 objective/write mismatch and grammar EN/FR parity are already logged in `internalDecisionHolds` and correctly deferred.
