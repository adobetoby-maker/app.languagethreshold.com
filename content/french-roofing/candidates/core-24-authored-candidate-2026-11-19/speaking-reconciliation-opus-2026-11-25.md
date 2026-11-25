# Core 22–24 speaking/original-scope reconciliation: critique

I checked the three supplements against their source packets. Below are the passes, six concrete corrections, and some out-of-scope notes.

## What passes

**Existing pairs are intact.** In all three lessons, the existing English and French opening, cues, replies, context, goal, word bank and English sequence match `speakingPriorDraft20261119` field for field.

**The new bilingual fields are consistent:**
- `turnSequenceFrench` equals the opening plus the alternating `partnerCueSupportFrench` and `expectedLearnerTurnsFrench`.
- Both `expectedAllLearnerTurns*` arrays equal the opening plus the expected turns.
- Each sequence has 7 turns and alternates learner/partner, with the closure merged into the last learner turn.

**Each exchange is coherent:**
- 22: each cue answers the prior request, and "What does it say?" sets up "The card says…".
- 23: question → answer, then a repeat request → repeat plus closure.
- 24: the wellbeing question gets an answer, then two card requests.

**Scope is held throughout.**
- `sourceSpeakingCompletionStatus` and `sourceObjectiveCompletionStatus` say "held/incomplete" everywhere.
- All gates are false, with no `selectedFrench` or `audioScript`, and no approval is claimed.
- No text gives equipment-readiness, footing/weather, symptom, or work/return authorization.

**Source faces and times are correct.** The `sourceTextProvenance` English matches the packet cards exactly. The only time is the 6:30 in Core 23 Reader 1, which is held unchanged and unused in speaking. No units are introduced.

## Concrete corrections (supplement fields only)

**1. Core 24 `speaking.frenchSupportConventionInternal` contradicts its own provenance.**
- It says vous is "not … a claim about exact Spanish register."
- But `activity:write`, `form:3` and `internalNotes` all say card 11's vous carries the source usted (*¿Cómo se siente?*).
- Replace with:
  > "English remains target; all existing French opening/cues/replies/context remain unchanged support. Card 11 *vous* mirrors source *usted* (¿Cómo se siente?) as an unselected candidate; *vous* in newly composed classroom turns is an unselected register proposal, not inferred approval."

**2. Core 24 `scopedInternalDecisionHolds[1]` misattributes the source.**
- As written, it implies "yes, a little" answers "How do you feel?". In the source it answers "Are you dizzy?" (Reader 5→6).
- "Does not look well" is a narrator observation (Reader 3), not Raúl's reply.
- Replace with:
  > "Partner reply 'I feel fine, thank you' is a classroom-only answer. It does not stand in for the source scene, where Raúl 'does not look well' (Reader 3, narrator observation) and answers 'yes, a little' to 'Are you dizzy?' (Readers 5–6); it must not be read as a symptom outcome."

**3. Core 23 `scopedInternalDecisionHolds[3]` overstates a hold.**
- The boots noun (card 9) is not held: the packet has `safetyOrMeaningHold: false`, and the candidate row has `les bottes`, `hold: null`.
- The held item is the boot-grip instruction (card 15 / Reader 4).
- Replace with:
  > "Source footing, the boot-grip instruction (card 15/Reader 4), lightning, storm and stop-if-weather-changes items remain held; the boots noun (card 9) is an unselected candidate and is not used here."

**4. Core 23 `openSourceQuestionDependencies` omits rain and wind.**
- The speaking uses card 6 (rain) and card 7 (wind).
- Core 22 linked rope to the lifeline question by semantic inference. By the same standard, rain and wind fall under Q4's "stop … if the weather changes."
- The current scope line "Pictured dew only" is inaccurate once the speaking turns are counted.
- Set `affectedUsedAnchors` to `["…card:1", "…card:6", "…card:7"]`.
- Set `speakingScope` to:
  > "Pictured dew, rain and wind only; no wet-roof footing, boot, weather-change threshold or access decision."

**5. French role parity: Core 22 and 23 add content the English roles don't have.** The English roles are existing fields, so trim the French to match:

| Lesson | Field | Current French | Recommended French |
|---|---|---|---|
| 22 | `learnerRoleFrench` | "…et en repère l'emplacement" (an extra locating action) | "Un apprenant demande des cartes de vocabulaire." |
| 22 | `partnerRoleFrench` | lists A/B/C contents | "Un partenaire montre des cartes de mots et des cartes-images." |
| 23 | `learnerRoleFrench` | "cartes-images de pluie, de vent et de rosée" (English says *pictures*; cues say *image*) | "Un apprenant décrit des images de vocabulaire." |
| 23 | `partnerRoleFrench` | adds questions and a repeat request | "Un partenaire présente des images." |

Core 24 roles are close enough; no change is needed.

**6. Core 22 `scopedInternalDecisionHolds[0]`: "anchor clearance" introduces a clearance concept.** Q1 explicitly flags clearance as absent from the source. Replace "anchor clearance" with "an anchor or lifeline decision."

## Observed in existing fields: not corrected, per scope

Flag these for the qualified French reviewer only.
- **Core 23 verb drift.** The French alternates *montre* (context, cues) and *représente* (learner turns), and `scaffoldVocabularyFrench.show` is *montrer*.
- **Copy-pasted scaffolds.** The `scaffoldVocabularyFrench` entries for *card*/*say* (Core 23) and *picture*/*say* (Core 24) are template copies that aren't used in those dialogues.
- **Fall-protection template wording.** `scenarioProvenance` in Core 23 and 24 still says "approved gear … protection-system check." That wording comes from the fall-protection template and doesn't fit the weather and heat scenes.
