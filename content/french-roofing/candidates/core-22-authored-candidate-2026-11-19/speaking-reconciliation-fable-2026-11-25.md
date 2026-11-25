**Verdict:** the three seven-turn exchanges hold up and need no pair changes; every correction below is to supplement metadata. This is from reading the paste only, with no file, hash or validator check, and it is AI critique, not qualified approval.

Each `turnSequenceFrench` matches opening + three cues + three replies, each `expectedAll…` list is opening + the three expected turns, and `speakingPriorDraft20261119` reads identical to the live fields in all three lessons. No turn states equipment readiness, a weather or heat decision, or work authorization.

## Corrections, in priority order

1. **Core24 Q4 dependency has the wrong relationship.** `card:11` is a listed member of `/sourceDecisionQuestions/3/affectedIds`, so it is not "inferred from wording".
   - Change to: "Direct: card 11 is listed in this question's affectedIds; affectedIds unchanged."

2. **Core22 Q1 dependency has the wrong basis.** Q1's wording names anchor, lifeline, lanyard and fall distance, never harness or rope.
   - Change to: "Inferred from sense adjacency (rope vs. lifeline/lanyard; harness via Reader 8), not from question wording or affectedIds."

3. **Template carry-over in Core22 and Core23 `internalNotes` makes false provenance claims.**
   - The last note cites "exact source symptom question/answer attribution", which exists only in Core24.
   - The "Final Fable proposals" note cites "direct clinical/specialist terms", which is also Core24-only.
   - Replace with lesson-specific wording: Core22 "printed-noun versus inspection-finding, competent-person exclusion"; Core23 "pictured-weather versus warning/command holds".

4. **Original objective is not explicitly incomplete at top level.** `sourceObjectiveCompletionStatus` says "held; lexical subset does not satisfy…", while the speaking status says "held and incomplete".
   - Make all three read: "held and incomplete; lexical subset does not satisfy the source work objective".

5. **Core24 French roles break parity and the Core22/23 pattern.**
   - `partnerRoleFrench` adds "shade (A) et water (B)", which is absent from the English role.
   - `learnerRoleFrench` embeds the quoted opening.
   - Both are finite sentences and masculine-only, where Core22/23 use "Une personne qui… / Une autre personne qui…".
   - Proposed learner role: "Une personne qui demande à une autre comment elle se sent, puis demande des cartes de vocabulaire."
   - Proposed partner role: "Une autre personne qui répond à une question sur son ressenti, puis montre des cartes de vocabulaire."
   - Add to `frenchSupportConventionInternal` in all three: learner/partner are rendered "une personne / une autre personne" as an unselected gender-neutral proposal.

6. **The new French fields are not marked as support.** `expectedAllLearnerTurnsFrench` and `turnSequenceFrench` lack the "Support" marker that `partnerCueSupportFrench` has.
   - Rename them with a `Support` marker, or add to the convention note: "French sequences are meaning support only, never expected or scored learner production."

7. **Scope holds omit unused or held items that touch the source mission.**
   - Core22: add "stop work (card 9) is an unselected candidate, not held and not used here; no stop-work command is selected." The source mission begins "Stop work…", and Core23 already does this for boots.
   - Core23: add the wet-roof warning (card 13 / Reader 2) to the held list; it is in `heldDecisionRefs` but not named.
   - Core24: add "site heat plan (Reader 8)" and note that card 15 is an unselected candidate not used here. Change "timeline interval" to "time interval".

8. **The dependency criterion is inconsistent across lessons.** Core22 links by sense adjacency (rope to lifeline), but Core23 links rain and wind only to Q4.
   - By the same standard, add Q3 (`/sourceDecisionQuestions/2`) for cards 6 and 7, scoped: "pictured rain/wind only; no storm identification or descent trigger."
   - Otherwise, state the narrower criterion once in each block.

9. **The questions blocking each source mission are not traceable from the speaking block.** The dependencies cover only the anchors used. Add one sentence to `sourceSpeakingCompletionStatus`:
   - Core22: "Mission blocked by open source questions 3, 4, 5."
   - Core23: "Mission blocked by open source questions 1, 2, 3, 4, 5."
   - Core24: "Mission blocked by open source questions 1, 3, 4."

## Left for qualified review, no change proposed

- **Core23:** the cues use "montre" and the replies "représente"; this is existing support.
- **Core24:** `contextFrench` drops "classroom pair", which is the framing that keeps "Je me sens bien" from reading as a site status.
- **Core22:** `card:12` and `reader:2` are held in the candidate rows although the packet has `safetyOrMeaningHold: false`. This is stricter than the packet and acceptable, but nothing records the divergence.
