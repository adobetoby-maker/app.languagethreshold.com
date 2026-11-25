# Core7–9 speaking/original-scope reconciliation critique

Read-only, from the pasted text. I couldn't verify hashes or files. Every correction below is limited to fields the reconciliation owns: speaking, objective, grammar explanations and holds/notes. Where a problem sits in a frozen face (activities, forms, dictionary, candidate rows, source packet), I've flagged it for the decision ledger rather than proposing an edit.

**No issues found in these areas:**
- Each lesson's `heldDecisionRefs` matches its set of held candidate rows exactly.
- All three lessons keep `sourceObjectiveCompletionStatus` explicitly incomplete.
- `qualifiedApproval` is false everywhere.
- No times or units appear in the speaking subsets.

---

## Core7

**1. Turn 5 → partner cue 3 doesn't connect (main coherence defect).**
- The learner asks "Is that clear?" but the partner never answers it. "Thanks, I have the tool name now." skips the yes/no.
- The prior draft had "Yes, that is clear." The reconciliation dropped it.
- Cue 2 ("What would you ask to check whether…") is also a meta-prompt. It makes "Is that clear?" a quoted answer rather than a real question, so any reply to it reads oddly.

Proposed sequence:

| # | Speaker | English | French support |
|---|---|---|---|
| 1 | L | This is a pry bar. | C'est un pied-de-biche. |
| 2 | P | Can you repeat the name of that tool, please? | (unchanged) |
| 3 | L | It is a pry bar. | C'est un pied-de-biche. |
| 4 | P | A pry bar. OK. | Un pied-de-biche. D'accord. |
| 5 | L | Is that clear? | Est-ce clair ? |
| 6 | P | Yes, that's clear. Thanks, I have the tool name now. | Oui, c'est clair. Merci, j'ai maintenant le nom de l'outil. |
| 7 | L | You're welcome. | Je vous en prie. |

**2. `partnerRole` describes a cue that doesn't exist.** It says the partner "asks how the term is used." Delete that clause.

**3. `goalEnglish`, `practiceContextEnglish` and `contextFrench` refer to a "word explanation" that never happens.** The learner only names the tool. Change to "ask whether the tool name is clear" / « demander si le nom de l'outil est clair ».

**4. `holdReason` misstates the source meaning.** "Full deck removal and confirmation objective" implies the deck itself is removed. The source says tear off everything *down to* the deck. Use: "The tear-off-to-deck command and confirmation objective remains held."

**5. `candidateObjectiveEnglish` says "recognize a removal-understanding question," but the activity is `write`, which is production.** It also doesn't mention that this item is held-dependent. Use: "…and write the source removal-understanding question (held-dependent; no removal scope approved)."

**6. French/English grammar parity gaps run both ways.**
- `grammarExplanationFrench` never explains the imperative ("Use the pry bar carefully"), which the English covers. Add: « L'impératif emploie le verbe de base sans sujet : « Use the pry bar carefully ». »
- The English never says the concrete scope must be known separately, which the French does. Add: "The concrete scope must be known separately."

---

## Core8

**7. Cue 2 → reply mismatch.** "Which image would you like to see again?" asks for a choice, but "Please show me the panel." answers with a request. Keep the learner turn and change the cue instead:
- EN: "Do you want to see one of the images again?" → "Yes. Please show me the panel."
- FR: « Voulez-vous revoir une des images ? » → « Oui. Montrez-moi le panneau, s'il vous plaît. »
- Update `expectedLearnerTurns*`, `expectedAllLearnerTurns*` and `turnSequenceEnglish` to match.

**8. `candidateWordBankEnglish` lists "This is a panel." twice.** Remove the duplicate.

**9. `holdReason` lists "cover" as a source term in the lesson cards, but no Core8 term card is "cover."** It appears only in phrase card 13 and the verb examples. Use: "Direct source terms rotten wood, repair and replace (term cards) and the cover command (phrase card 13) remain intact…"

**10. The objective and the holds contradict each other.**
- The objective says "recognize a marking instruction," and the hear activity uses "Mark the damaged area."
- But `internalDecisionHolds` says "No … marking instruction," and source question 5 lists `reader:7` as affected.
- Fix: add to `internalDecisionHolds`: "Hear item 'Mark the damaged area.' is source-sentence recognition only; source question 5 (archive-added marking) remains open." Leave the activity unchanged.

**11. Ledger only, don't edit: legacy ID collision in the Core8 packet.**
- Every Core8 card and reader row has `legacySourceRef` `roofing:7:…`, which is identical to Core7's refs.
- Core9 uses `roofing:9`, so Core8 is probably mis-mapped.
- Check this against `src/data/roofing-lesson-words.ts` and `roofing-lesson-passages.ts` before the IDs are trusted for any saved-item or progress mapping.

---

## Core9

**12. The final learner turn turns a reported quote into a command and thanks no one.**
- "Put on your gloves. Thank you." is spoken by the learner, so it reads as the learner issuing a PPE instruction. That contradicts the goal of reading it "as a printed imperative."
- The "Thank you" has no antecedent.

Fix:
- EN: "It says, 'Put on your gloves.' That's all."
- FR: « Il dit : « Mettez vos gants ». C'est tout. »
- Set `closureEnglish` to "That's all." and `closureFrench` to « C'est tout. »
- Update the expected-turn arrays and `turnSequenceEnglish` to match.

**13. Minor: cue 2 → reply verb mismatch.** "Which worker has the shovel?" is answered with "…uses the shovel." Change the cue to "Which worker uses the shovel?" / « Quel ouvrier utilise la pelle ? » so the cue models the target verb.

**14. `candidateObjectiveEnglish` "produce … old-nail removal phrase" reads like the held assignment.** Use: "…write the source old-nail sentence (language item only; no nail-work assignment)." This matches `internalDecisionHolds`.

---

## Priority

1. **Coherence defects:** #1, #7, #12.
2. **Meaning or scope misstatements:** #4, #9, #10.
3. **Ledger:** #11, the legacy ID collision, which needs a source audit before any ID mapping.
4. **Objective and parity fixes:** #2, #3, #5, #6, #8, #13, #14.
