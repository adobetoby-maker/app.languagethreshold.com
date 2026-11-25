**Verdict:** the three speaking blocks need text corrections before they are coherent, but none breaches the safety or scope limits. Nothing states readiness, comprehension, hazard clearance, an accepted order or a date, and each `objectiveProvenance` explicitly marks the original objective incomplete. I could not check hashes, the "retained from existing speaking row" claims, or that the protected faces/activities/forms/dictionary are unchanged; the three openings do match the 2026-11-19 prior drafts.

Every fix below touches only `speaking`. Each wording or order change must be propagated to the parallel arrays (`partnerCuesEnglish`, `partnerCueSupportFrench`, both expected-turn pairs, `turnSequenceEnglish`, word bank, provenance strings).

## Core 4

1. **Cue 2 and its reply do not match.** "Which part of the roof is the highest?" asks for an identification, but the reply "The ridge is at the highest part of the roof." gives a location. `goalEnglish`/`goalFrench` say "identify the ridge **as** the highest part", which contradicts the provenance claim that the "at" relation is unchanged.
   - Cue: "Where is the ridge?" / « Où se trouve le faîtage ? » (this also uses the lesson's own "Where is…?" grammar note).
   - Goal: "…then say where the ridge is." / « …puis dire où se trouve le faîtage. »
   - Update `partnerCueProvenance` to match.

2. **The summary turn cannot be built from the word bank.** The only chips are "The gutter is clogged." (with full stop) and capitalised "The ridge is", but the turn needs "clogged, and the ridge is…".
   - Simplest fix: make the summary two sentences, "The gutter is clogged. The ridge is at the highest part of the roof. Thank you." / « La gouttière est bouchée. Le faîtage se trouve dans la partie la plus haute du toit. Merci. »
   - Then drop the "and" chip.

3. **French parity in the context.** `contextFrench` says « schéma de toit **fictif** étiqueté » where English says "labelled **practice** roof diagram". Use « schéma de toit d'entraînement étiqueté », or add "fictional" to the English.

4. **Picture versus diagram.** `partnerRole`, the goal and the provenance say "picture"/« image »; the context says "diagram"/« schéma ». Pick one in both languages.

5. **Role mismatch.** The roles are "worker"/"coworker", but `practiceContextEnglish` says "Two learners". Suggested: "Two learners play coworkers looking at…" / « Deux apprenants jouent des collègues… ».

6. **Role provenance is missing.** In the source the foreman asks (Reader 7, held) and a worker points (Reader 8, held). `openingProvenance` should say the learner-as-worker asker is a new role, not the source speaker.

7. **Cue 1 French.** « Que remarquez-vous **sur** la gouttière ? » reads as physically on the gutter. Use « Que remarquez-vous à propos de la gouttière ? ».

8. **Missing dependency on the ridge sense.** Turns 2 and 3 use « le faîtage », but card 6 still has `faîtage`/`faîte` unselected, and "highest part" is where the two diverge. Add this to `internalDecisionHolds`; no change to the card row.

9. **Missing dependency on the downspout.** Source question 7 lists card 4 as affected and says to review before authoring speaking. Card 4 is the opening's anchor, so name it in `internalDecisionHolds` alongside the existing Reader 7 reference.

## Core 5

1. **Cue 2 does not do what its provenance says.** "Anything else?" invites another item (the held cement/sealant line), not a delivery question, yet `partnerCueProvenance` describes it as asking "what else the learner wants to know".
   - Replace with "Do you have a question about delivery?" / « Avez-vous une question sur la livraison ? »

2. **Cue 3 prompts nothing.** After "I will check the delivery date.", the reply "Please confirm the order." is a non-sequitur.
   - Replace with "I will check the delivery date. Anything else?" / « Je vais vérifier la date de livraison. Autre chose ? »
   - This moves the open prompt to where the closure answers it, and still leaves the request unanswered.

3. **The context overstates what happens.** "…plays the supplier and **checks a delivery date**" / « vérifie une date de livraison » says the check occurs. Change to "says the delivery date will be checked" / « dit que la date de livraison sera vérifiée ».

4. **Update `scenarioProvenance`** ("the delivery question follows the partner's prompt") once cues 2 and 3 change.

## Core 6

1. **Turn order contradicts the goal, the source and logic.** The goal lists hazard, then understanding, then questions, and the source Reader runs 7, 8, 9 in that order. The sequence instead asks "Does everyone understand the plan?" straight after "Let's review…", before anything is reviewed. Swap cues 1 and 2 with their replies in all arrays.

2. **Cue 2 brings back the rejected "report" framing.** "…ask people to **report** a hazard" / « signaler un danger » is the archived sense the candidate row replaced with "tell me if".
   - Use "What would you say so that people tell you if they see a hazard?" / « Que diriez-vous pour que les gens vous disent s'ils voient un danger ? »
   - Change `goalEnglish`/`goalFrench` to "ask people to tell you about hazards" / « demander qu'on vous dise si l'on voit un danger ».
   - Add the open source question on cards 9 and 14 and Reader 7 (register, signaler/aviser) to `internalDecisionHolds`.

3. **`learnerRole` implies the held leadership role.** "An untitled person **leading** a…plan check" should become "A learner demonstrating plan-check phrases", which matches `practiceContextEnglish`.

4. **French parity.**
   - Cue 3 French adds « le groupe », which is not in the English; add "the group" to the English or drop it from the French.
   - « petit groupe de langue » should be « petit groupe de pratique linguistique ».
   - « vérifier la compréhension et les questions » should be « vérifier la compréhension et demander s'il y a des questions » (the English "check understanding and questions" has the same flaw).

5. **Anchors.** The Core 4 and 5 speaking anchors cite the unheld duplicate Reader rows; Core 6 omits Readers 7, 8 and 9. Add them or apply one rule across all three.

6. **`partnerRole` style.** It is a lowercase fragment; align it with the others: "A practice partner prompting language functions."

## All three

- **No French for the roles.** `learnerRole` and `partnerRole` have no French counterpart while every other learner-facing speaking field does. Add them, or mark the roles internal-only.
- **Gender handling is inconsistent.** Core 4 uses « la coéquipière ou au coéquipier »; Cores 5 and 6 use masculine generics. Choose one convention.
- **Apostrophes are mixed inside the speaking blocks** (« aujourd'hui » and "Let's" against « d’un » and "group’s"). The internal note only covers scoring comparison; normalise the newly authored speaking strings.
