Critique of the pasted text only; nothing was opened or hash-checked, so pins and "unchanged" claims are unverified. No equipment-readiness answer, safety outcome or work authorization appears in any of the three exchanges, and all three state the source objective as held and incomplete. No changes are proposed to source faces, activities, forms or dictionary entries.

## Foundation 4
1. **Role and context clash.** The learner reports aloud to the crew lead ("That is my report."), yet the lead asks "In the printed report…" and "What does the report say you have…". `practiceContextEnglish` and `contextFrench` never mention a printed report. Add "printed"/"imprimé" to both, or drop it from all three cues and their French.
2. **Goal overstates the source.** "Request cold water" is not what line 3 says ("I want cold water"). Change `goalEnglish` and `candidateObjectiveEnglish` to "say you want cold water", and `goalFrench` to "dire que vous voulez de l'eau froide".
3. **Missing hold-origin note.** `line:7` is in `heldDecisionRefs`, but the decision gives it conditional French and no review note. Add `supplementHoldOriginNotes` marking it supplement-origin, as Foundation 5 and 6 do.
4. **Casque divergence is under-scoped.** The hold note names only Reader 4. The same "le casque de chantier" versus decision "le casque" split affects `candidate:cards:4`, `dictionary:4`, `activity:write` and the second expected French turn.
5. **Cold-water dependency is unmarked outside speaking.** `form:3` and `activity:write-extension` use "eau froide" while the `line:3` decision is open. Record the dependency in `internalNotes` without touching them.
6. **Register chosen silently.** The French cue support has the crew lead say "vous" while tu/vous is a course-level hold in Foundation 5 and 6. Flag it as an unselected support gloss.
7. **Word bank lacks "and".** It is needed three times to build the expected turns.

## Foundation 5
1. **`contextFrench` misreads.** "…le nettoyage d'une fiche de leçon imprimée" attaches the cleanup to the sheet. Use: "Deux apprenants lisent, sur une fiche de leçon imprimée, les énoncés fictifs sur l'arrivée, le nettoyage et le lendemain." Reorder the English to match the turn order (arrival, cleanup, tomorrow).
2. **`goalFrench` is off.** "Le calendrier" is not "timing", and "l'ordre du nettoyage" means the order within the cleanup. Suggested: "Expliquer en anglais le programme, les moments (aujourd'hui, demain) et la place du nettoyage."
3. **Goal overclaims.** "Cleanup sequence" cannot be explained when the antecedent of "After that" is omitted, as `holdReason` admits. Narrow it to "arrival, the quoted cleanup line and tomorrow's plan".
4. **Opening provenance is wrong.** "Existing opening retained" hides that "Today we get to the jobsite early." is a composition (card 1 plus line 2), not a source quotation. Say so, as the prior draft did.
5. **Roles clash with context.** Roles are "crew member explaining today's plan" and "coworker listening"; the context is "two learners read a printed sheet", and the final turn is about tomorrow. Align them.
6. **Three names for one document.** "Printed account", "the text" and "printed plan" all appear, and the third French cue drops "printed". Pick one term in both languages.
7. **Reader 3 is unaccounted for.** It is unheld and is the only "today" plan line, but provenance and `holdReason` do not say it is unused.

## Foundation 6
1. **Cue 1 is a verbless fragment with no subject.** "How many days a week in the printed account?" does not lead to "I work on roofs…". A register-neutral fix: "In the printed account, how many days a week is the roof work?" / "Dans le récit imprimé, le travail sur les toits, c'est combien de jours par semaine ?"
2. **Goal overclaims "roof work".** The cut, nail and bring-down lines are all held. Use "Describe arrival time, days worked per week, the quoted ascent time and end-of-day cleanup", with matching French.
3. **Provenance omits the seven-o'clock ascent.** `line:3` is used and anchored but not listed among the elements used.
4. **`sourceAnchors` order matches nothing.** It reads 1, 2, 7, 3; the turns run 2, 1, 3, 7.
5. **Closure implies completeness.** "That's our workday." contradicts `holdReason`. Consider "That's the printed routine." / "Voilà la routine imprimée."
6. **Hold text is cross-contaminated.** The same appended sentence about "lunch" and "I nail" sits on both `candidate:cards:8` and `candidate:reader:4`. Each needs only its own half, and `dictionary:8` lacks it entirely.

## All three
- Apostrophes are mixed (’ in the new cue and context strings, ' elsewhere). Normalize them before any string comparison.
- The closure has no standalone French field; it appears only inside the last expected turn.
