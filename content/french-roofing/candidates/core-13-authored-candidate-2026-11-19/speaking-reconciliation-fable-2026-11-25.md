# Critique: French Roofing Core 13–15 speaking reconciliation

Nothing here blocks on safety, authorization or source roles, but four speaking exchanges need text fixes and three metadata fields contradict the rows they describe. This was read from the paste only: I could not check the hashes, pins, or whether faces, activities, forms and dictionary are byte-unchanged from the earlier candidates.

## Must fix: turn coherence

1. **Core 14, cue 3 does not answer the question.** The learner asks "Where are the manufacturer instructions?" and hears "Card C has that label." The closure "Thanks, that helps" then reads as if the document was located, which your own `internalDecisionHolds` denies.
   - Cue 3: "They are not here. Card C only has the words. Please read the card."
   - French: « Elles ne sont pas ici. La carte C porte seulement les mots. Lisez la carte, s’il vous plaît. »
   - Final learner turn and closure: "The manufacturer instructions. Thank you." / « Les instructions du fabricant. Merci. »
   - Update `closureEnglish`, `closureFrench`, the word bank ("Thank you." replaces "Thanks," and "that helps.") and both expected-turn arrays.

2. **Core 14, cue 2 presupposes an earlier request.** "Do you need anything else?" follows no request. Use the Core 15 wording: "Do you have a question?" / « Avez-vous une question ? »

3. **Core 15, the width question has no referent.** No card or item in the context has a width, and nothing in "Do you have a question?" leads to "What is the width?".
   - Add to the context: "Card D has the question: What is the width?" / « La carte D porte la question : “What is the width?” »
   - Cue 3: "Please read card D." / « Lisez la carte D, s’il vous plaît. »
   - Set `endingType`, `widthQuestionStatus` and `closureProvenance` to say it is a read-aloud question with no value and no answer expected.
   - Add the card D reading to `goalEnglish` and `goalFrench`.

4. **Core 15, the bare "Yes." confirms identity, not the label.** The goal says "ask whether a word card *says* backing paper", but the learner-facing exchange is "Is this the backing paper?" / "Yes." The label-only scope exists only in an internal hold.
   - Cue 1: "Yes, card C says backing paper. What does card B say?"
   - French: « Oui, la carte C indique “backing paper”. Que dit la carte B ? »

5. **Core 13, "Edge E1." cannot be derived.** E1 and E2 are equally valid answers to "Which edge do you mean?".
   - Add to the context: "The learner holds a card marked E1." / « La personne qui apprend tient une carte marquée E1. »

## Should fix: provenance and dependencies

6. **Core 15 `frenchSupportProvenance` contradicts the rows.** It says membrane and width senses "remain pending", but neither carries a pending flag. Since rows must not change, reword it: "adhesive and backing paper carry `qualifiedSenseReviewPending`; membrane is generic-only, linked to card:2; width is unflagged; all unreviewed."

7. **Core 15 `internalDecisionHolds` adds unsourced terms.** "temperature/roller" appears nowhere in the packet. Replace with "adhesive/backing peel-and-press method".

8. **Core 14 is missing a dependency for fastener.** Card:3 is used in speaking, but source question 3 (`/sourceDecisionQuestions/2`, plastic cap nails and the French fastener term) is not listed. Add it by the same inference used elsewhere, with scope "generic fastener noun only; no selected fastener or fastening method."

9. **Core 14 has no pending-sense note for fastener.** The speaking French uses « l’élément de fixation », while the pinned packet's archived and conditional French is « la fixation ». Add a `frenchSensePendingNote` like the one Core 15 has for backing paper.

10. **Core 13 is missing dependencies for edge.** Card:5 is the main noun, but only question 5 (corner) is listed. Questions 1 and 2 (`/sourceDecisionQuestions/0` and `/1`) both concern what "edge" covers (rake/rive, eave). Add them with scope "generic label noun; no rake/eave sense or placement."

## French parity and learner-facing wording

11. **Core 13 context leaks authoring language and a gender.** Replace "Before the seven-turn exchange, the partner says" / « Avant l’échange de sept répliques, le partenaire dit » with "First, the other person says" / « D’abord, l’autre personne dit ». This also matches `partnerRoleFrench` (« Une autre personne »).

12. **Core 13 grammar note drops "base".** English says "Please + base verb"; French says « Please » + verbe. Whether you can fix it depends on whether the grammar explanation counts as frozen.

13. **Core 15 French glosses add articles.** "Adhesive." / "Membrane." are bare label readings; use « Adhésif. » / « Membrane. » in both French expected-turn arrays.

14. **The shared role text fits only Core 13.** "practising requests and nouns with cards or a hypothetical sketch" is reused, but Core 14 has pictures and cards with no sketch, and Core 15 has cards with no requests. Tailor `learnerRole`, `partnerRole` and their French per lesson.
    - Core 14: "naming pictured items and reading a word card"
    - Core 15: "reading word cards and asking questions"

15. **Core 14 context needs the pointing gesture.** Add "The learner points to picture A." / « La personne qui apprend montre l’image A. » so "This is a roll." has a referent. Change `practiceContextProvenance` from "label context" to "picture-and-label context".

## Checks that pass

- **Three cues and replies:** each lesson has three cues, three replies and seven turns, and the arrays, `expectedAllLearnerTurns` and word banks agree with the sequences.
- **Roles, time, units:** no installer, foreman or crew-lead role is used, no yesterday/today timeline, and no number is attached to inch or width.
- **Readiness and authorization:** no work instruction or equipment-readiness answer appears, apart from the implied resolutions in items 1 and 4.
- **Incomplete status:** `sourceObjectiveCompletionStatus`, `sourceSpeakingCompletionStatus`, `holdReason` and all-false gates are present in all three; nothing claims qualified approval.
- **Held refs and pointers:** `heldDecisionRefs` match the null-French candidate rows exactly, and the existing `jsonPointer` values match their question numbers.

## Pre-existing inconsistencies in frozen sections

Do not fix these in this pass, but your validator should expect them:

- Core 13 dictionary:6 uses `senseReviewPending`, where the other rows use `qualifiedSenseReviewPending`.
- Core 14 dictionary:12 has a different `scopeNote` from candidate card:12 and lacks its `linkedHeldDecisionRefs`.
- Core 14 candidate « Pas de plis. » and « le pouce (unité de mesure) » differ from the packet's « Sans plis. » and « le pouce » with no correction note.
- Core 13 marks « poser » as `genericSenseOnly`, though it is the trade-specific choice over « installer ».
