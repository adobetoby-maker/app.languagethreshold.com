**Verdict:** the supplements are additive and internally coherent, but the new fields need the corrections below. This is a read of the pasted text only (no file, hash or repo check), and it is not qualified approval.

## What holds
- **Earlier values:** every `priorSpeaking` key reads identically in `speaking` for Core28–30 (compared by eye, not byte-diffed), and no pair is re-authored.
- **Derived sequences:** in all three lessons `turnSequenceFrench` is exactly opening + `partnerCueSupportFrench` + `expectedLearnerTurnsFrench`, 7 turns, with speakers matching the English. Both `expectedAllLearnerTurns*` arrays are opening + the three expected turns, and `closureFrench` matches the tail of the final turn.
- **Literal provenance:** every `exactSourceEnglish` matches the supplied source face, including the full Reader1 sentence.
- **Question dependencies:** all copied question texts are verbatim and all pointers are correct. The direct/inferred labels are right: only Core30 Q1 (card:1, reader:1) is direct.
- **Hold coverage:** `candidateLevelHoldEvidence` covers exactly the held refs not listed in any `affectedIds` (five in Core28, reader:9 in Core29, none in Core30). The quoted hold texts could not be checked because those candidate rows were not pasted.

## Corrections, all lessons
1. **`learnerRoleFrench`** drops "learner", and "pose des questions… et y répond" reads as answering one's own questions. It is also false for Core28, where the learner opens with a statement. Use: `Un apprenant ou une apprenante qui amorce l’échange sur les images de vocabulaire et répond aux questions.`
2. **`partnerRoleFrench`**: "Une autre personne" is not "partner". Use: `Un ou une partenaire qui tient et montre toutes les images et toutes les cartes de vocabulaire.`
3. **`affectedUsedAnchors`** on inferred rows implies the anchors are in `affectedIds`. Rename it to `relatedUsedAnchors` on inferred rows, or add `"listedInAffectedIds": false`.
4. **`sourceQuestion`** is 1-based beside a 0-based `jsonPointer`. Rename it to `sourceQuestionOrdinal1Based`.
5. **`newNotes[0]`** overstates with "checked against exact bilingual source". Use "checked against bounded pasted source excerpts; no file/hash verification".

## Core28
6. **`scopedInternalDecisionHolds[0]`**:
   - Label the quote as `sourceSpeakingEnglish` and keep its final period; the objective proper is "Assign gutters and site cleanup".
   - Change "printed broom/nails picture" to "pictures A and B".

## Core29
7. **`relationship`** on Q2 and Q4 says "Inferred explicit…", which contradicts itself. Use "Inferred from literal term overlap with the question text ('unfinished work' / 'remaining materials'); not listed in affectedIds."
8. **`sourceTextProvenance` card:2 `status`**: three unselected French forms coexist (archived `inachevé`, candidate `non terminé`, earlier turn `n’est pas terminée`). Say so instead of the generic "prior French support unselected".
9. **`scopedInternalDecisionHolds[0]`**: add "no materials availability/readiness and no rework or repair approval".

## Core30
10. **Used anchors under an open direct question.** card:1 and reader:1 are in the `affectedIds` of open Q1, are used as `sourceAnchors`, and are absent from the earlier `heldDecisionRefs`. Leave `heldDecisionRefs` untouched. Add `"usedAnchorsUnderDirectOpenQuestion": ["core-roofing:30:fr-en:card:1", "core-roofing:30:fr-en:reader:1"]` and cite both ids in `scopedInternalDecisionHolds[0]`.
11. **`sourceLanguageObjectiveConflict.englishTargetForCurrentPair: true`** reads as an accepted English target. Replace it with:
    - `"pairLevelTargetPerSourceQuestion": "English (as stated in /sourceDecisionQuestions/0)"`
    - `"capstoneObjectiveLanguageResolved": false`
    - `"archivedFrenchObjectiveExact": null`, with the note "not supplied in bounded excerpt; not paraphrased".
12. **`frenchSupportConventionInternal`**: "English remains target." is too flat here. Use "English is the pair-level target per /sourceDecisionQuestions/0; the capstone objective language (source Spanish, archived French) remains unresolved."
13. **Reader1 row in `sourceTextProvenance`**: the generic status does not keep it distinct from the picture statement. Use "Exact source Reader face recorded as time-context provenance only; quoted in no speaking turn. 'The briefing is in the morning.' is a separate earlier classroom composition, and the foreman is not the card:6 crew lead."
14. **`sourceTextProvenance` card:1 `status`**: note the unselected variants (archived `la réunion d’équipe`, candidate `la réunion d’information`, bare `la réunion` in the earlier cue).
15. **Reader1 `sourceKind: "reader"`**: the supplied face has no `kind`. Mark it "derived from anchor id".
16. **Inferred dependencies are selective.** Q3's text literally names "the lead" (card:6), and Q5 is a safety review (card:4). Add both as inferred rows, or add `"inferredDependenciesNonExhaustive": true`.
17. **`newNotes[2]`** mentions candidate-level holds, and Core30 has none. Drop that sentence, and add `"candidateLevelHoldEvidence": []` so the schema matches Core28–29.
18. **`sourceObjectiveCompletionStatus`**, if it is new: "source work objective" misdescribes a language capstone. Append "source-language objective conflict open; no English capstone selected".

## Existing issues, internal only (do not edit)
- **Core28:** the learner says "Here are the pictures." while the partner holds them, and "Where is the broom?" in the word bank is never used.
- **Core29:** the roles and scaffold mention pictures, but the lesson has only word cards. The partner's "No." asserts a status.
- **Core30:** the French cue shortens "briefing" to `la réunion`.
