# Critique: Foundation 4–6 speaking/original-scope reconciliation (read-only)

These corrections are based only on the pasted text. I did not verify any hashes, paths or the `sourceAuditOriginMain` pin. Nothing below approves French, trade, dictionary or audio content. Every correction targets the speaking block, objective, provenance or notes. None changes the candidate faces, activities, forms or dictionary.

## High priority

**1. F5: the cleanup turn comes after "tomorrow".**
- The sequence is arrival, then "Tomorrow we're going to start another roof", then "After that we do the cleanup."
- In that order, "After that" refers to tomorrow's roof, which reverses the source order (line 6 before line 7).
- **Fix:** swap partner cues 2 and 3 and their replies, then reorder `expectedLearnerTurns*` and `expectedAllLearnerTurns*` to match. Put the closure on the final "tomorrow" turn: "Tomorrow we're going to start another roof. That's our plan."
- Even after the swap, "After that" has no work as its antecedent, because line 3 was deliberately excluded. Add that gap to `holdReason` so it isn't presented as complete.

**2. F4: the cues read as a live equipment check.**
- The crew lead asks "What do you have, and what do you need?" and the learner answers "I have the hard hat and the gloves…". That works as a PPE-readiness answer, which you said to exclude.
- `practiceContextEnglish` already calls this a fictional report, but the cues don't refer to it the way F5 and F6 do.
- **Fix:** make the cues refer to the printed text, with matching French:
  - "In the printed report, what is the problem?"
  - "What does the report say you have and need?" / « Selon le compte rendu, qu'est-ce que vous avez et de quoi avez-vous besoin ? »
  - "What does the report say you want?"

**3. F4: line 3 is treated as resolved, but the decision still holds it.**
- In the decision, `line:3` has `conditionalFrench: null` and a temperature-wording review note.
- The supplement gives it `hold: null`, and speaking uses it as source-anchored.
- **Fix:** add `foundation-roofing:4:fr-en:line:3` to `heldDecisionRefs`. Add an `internalDecisionHolds` entry: "line:3 — decision-held (froide vs fraîche); candidate used, not selected." The phrase "restored per source" in the provenance should read "proposed per source English; decision hold open."

**4. F4: the line 4 French doesn't match the decision.**
- Speaking turn 3 uses "le casque de chantier". The decision's conditional face for card 4 and line 4 is "le casque", and no correction note explains the change. Only reader 3 has one.
- **Fix:** leave the faces as they are. Add a speaking provenance sentence: "Line 4 French follows supplement candidate 'le casque de chantier', which differs from decision conditional 'le casque'; unresolved."

**5. F5 and F6: holds the decisions don't contain are listed as decision holds.**
- F5 `line:1` has a non-null conditional face and `reviewNote: null` in the decision, yet it is in `heldDecisionRefs`.
- F6 `card:1` ("le travail") and `card:11` ("Vous habitez où ?") are the same: conditional faces, no review note, yet listed as decision holds.
- **Fix:** move these to a separate `supplementHoldRefs` list, or label each one "supplement-level hold; decision does not hold". Don't present them as decision holds.

**6. F5: the provenance contradicts the hold list.**
- The provenance says "new house … elements are used".
- The hold list says Reader 1 is "used only as printed scene wording" and then "not used in canonical exchange". No turn uses it.
- **Fix:** remove "new house" from the provenance. Reduce the reader:1 entry to "held (new-house sense); not used."

## Medium priority

**7. F6: the last cue asks for something already said.**
- The opening is the 6 a.m. arrival. The third cue asks "What time does the crew get to the jobsite?", and the reply repeats the opening word for word.
- **Fix:** keep the times in order (6 → 7 → end of day). Replace cue 2 with "What time do we go up in the printed account?", answered by "We go up at seven." This uses `line:3`/`card:10`, which are not held. Move the cleanup cue last and put the closure on it.
- If roof-ascent wording is excluded across the whole course, as in F5, use another unheld element instead and say so in the provenance. Either way, update `practiceContext*` to match the new cue order.

**8. Learner-facing text exposes internal holds (F5).**
- `candidateObjectiveEnglish` says "ability/help requests remain held".
- `grammarExplanationEnglish` says "Ability/help-request practice remains held with the register decision."
- F6 deliberately keeps holds out of learner text, so F5 is inconsistent.
- **Fix:** move this wording to `holdReason`. Separately, the grammar example "going to a house" leans on the held line 1. Prefer "going to the jobsite".

**9. F4: the objective overclaims.**
- `candidateObjectiveEnglish` still says "using the exact source scene". The speaking goal dropped that phrase, and the exchange covers neither the "missing on the roof" content nor the *hay que* obligation.
- **Fix:** align the objective with `goalEnglish`. State in `holdReason` that the source items "what is missing on the roof" and "hay que (obligation)" are unmet.
- The phrase "system meanings" in `holdReason` is unclear. Rename it to "harness / fall-protection meaning (card 12)".

**10. F5 and F6: closures say "my" for a group activity.**
- Every turn uses "we" or "the crew". F6's prior draft said "our usual routine".
- **Fix:**
  - F5: "That's our plan." / « Voilà notre programme. »
  - F6: "That's our workday." / « Voilà notre journée de travail. »
  - Update `closureEnglish` and the word banks to match.

**11. Copied internal note.**
- F5 and F6 `internalNotes` end with "Direct thirst/water vocabulary preserved". Neither lesson has thirst or water content.
- **Fix:** delete that clause in F5 and F6 and keep the "no heat illness / work authorization" clause.

## Low priority

**12.** F5 word bank has "we’re going to start" with a curly apostrophe, while the expected turns use a straight `'`. This will break string matching. Normalize the English apostrophes to straight ones.

**13.** F5 speaking `sourceAnchors` leave out `card:1` (today), which the opening uses. The prior draft included it. Add it.

**14.** F6 provenance refers to `earlierDraft`, but the field is named `speakingPriorDraft20261118`. Correct the reference.

**15.** F4 terminology: `contextFrench` says « compte rendu » but the closure says « Voilà mon rapport ». Use one term. "That's my report" is also more natural English than "That is my report."

## Still explicitly incomplete

| Lesson | Unmet source scope |
|---|---|
| F4 | missing-on-roof items, *hay que* obligation, material/debris/shingle senses, temperature-wording hold on line 3 |
| F5 | help request, ability/register, work content between arrival and cleanup |
| F6 | morning work with shingles, lunch, afternoon old material, register, bare "day" sense |

No equipment-readiness, safety or work-authorization outcome should be read into any turn. That depends on fix 2 for F4.
