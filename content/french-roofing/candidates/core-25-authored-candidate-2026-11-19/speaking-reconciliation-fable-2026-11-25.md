**Verdict:** the additive supplements for Core 25–27 hold up against the pasted old/new values, with six concrete new-field corrections below. This is a read of the paste only, with no file, hash or repo verification, and it is not qualified approval.

## What checks out (all three lessons)
- **Preservation:** every key in `priorSpeaking` appears unchanged in `speaking`, including arrays, `sourceAnchors`, `heldDecisionRefs` and `holdReason`. No pair is re-authored.
- **Role parity:** `learnerRoleFrench` and `partnerRoleFrench` match the English roles in content and scope, with nothing added.
- **Derived sequences:** each `turnSequenceFrench` is exactly opening, then cue and expected turn interleaved, giving 7 turns that align with `turnSequenceEnglish`. Both `expectedAllLearnerTurns*` arrays are the opening plus the three expected turns, and `closureFrench` matches the merged final turn.
- **Source provenance:** each `sourceTextProvenance` entry matches its `exactUsedSourceFaces` row on anchor, English face and kind.
- **Dependencies:** quoted question text is verbatim, the 1-based `sourceQuestion` matches the 0-based `jsonPointer`, and no used anchor appears in any `affectedIds`, so `inferred` is correct throughout and there are no direct dependencies.
- **Mission status:** the original mission is stated as held and incomplete, the pointers cover all questions, and the gates are all false. Equipment readiness (25), repair adequacy and sign-off (26) and repair or inspection approval (27) are each disclaimed.

## New-field corrections
1. **27 `openSourceQuestionDependencies` order:** entries run 2, 3, 5, 4. Reorder to 2, 3, 4, 5 and give the Q4 entry the same key order as the others (`status`, `speakingScope`, `dependencyType`).
2. **26 `openSourceQuestionDependencies[1].affectedUsedAnchors`:** listed as card:1, card:7, card:6. Reorder to card:1, card:6, card:7 to match `sourceAnchors` and the other entries.
3. **26 and 27 `frenchSupportConventionInternal`:** the French sequence answers a "what is printed on card C" cue with "Mesure" and "Produit d’étanchéité", while the card bears the English word. Append: "Where a turn reads a printed English card word (26 measurement, 27 sealant), the French sequence gives a gloss of that word, not the printed text." Lesson 25 does not need it, since "danger" is the same in both languages.
4. **25 `sourceTextProvenance` card:8 `status`:** the generic status hides that the speaking French does not use the face's French. Replace with: "Exact source face recorded; speaking French uses the new literal candidate le cône (candidate:cards:8), not archived/conditional le cône de signalisation; both unselected."
5. **`scopedInternalDecisionHolds` gaps against the lesson's own `speakingScope` text:**
   - **25, item 1:** add "PPE sufficiency under overhead work" (Q3 scope) to the list of things not established.
   - **26, item 1:** add "an actual damage finding" (Q3 scope), since the learner says "The area is damaged."
6. **`newNotes[1]` in all three:** "Final Fable corrections source-checked … speaking cue/answer alignment and English/French support corrected" reads as if this batch changed speaking values, contradicting note 3. Scope it to the earlier pass and narrow the claim: "Earlier pass (not this batch): corrections checked against supplied excerpts only; …".

## Existing issues (internal only, no change)
- **27 `heldDecisionRefs`:** card:4, card:12, reader:1 and reader:2 are not in any pasted `affectedIds`. They may come from holds outside the excerpt.
- **25 and 27 `contextFrench`:** "Le partenaire" is masculine, while the new roles use "Une personne partenaire". The register choice is still unselected.
- **26 `contextFrench`:** it quotes « repair photo » in guillemets but leaves measurement bare.
