**Read-only review of core-roofing 7–9 (fr-en): correction proposals only, no approval given.** I worked from the pasted JSON alone, so the "exact source" and "archived French" claims and the packet hashes are unverified against the packet files.

## Cross-lesson

1. **Internal framing in learner text.** Objectives, roles and goals carry provenance hedges: "in a language exercise" (7, 9), "hypothetical labelled example/card" (8), "vocabulary description" (7). Proposal: state the language task directly and keep the hedges in `scenarioProvenance`, which already has them.
2. **Unlabelled role shift.** The source imperatives and checks are the foreman's lines, and the foreman role is itself held (7 reader 2). Speaking reassigns them to "a coworker" without saying so in provenance, and "Is that clear?" or "Put on your gloves." between peers is curt. Proposal: label the role change and add the role hold to `heldDecisionRefs`.
3. **Conflicting shingle hold rationale.** Lesson 7 says the Spanish "explicitly names asphalt shingles"; lesson 9 says Spanish "tejas can also mean roof tiles", for the same English sentence. Proposal: reconcile against the packets.
4. **Hold-propagation gaps.**
   - The dumpster hold (9 card 1) is not linked on 7 card 11 / reader 7, so those rows could release once shingles are resolved.
   - The underlayment term is declared open in the 9 card 12 hold, yet 7 card 7 "la sous-couche" is an unheld candidate and feeds the recall activity.
5. **Unquoted examples.** The English grammar explanations in 8 and 9 do not quote their examples ("In Pull all the old nails, all the is…"). Proposal: quote them as in 7.

## Lesson 7

- **Write activity leans on the held scope.** "Do you understand what must be removed?" refers to exactly the removal scope held on cards 10, 12 and 13, and the objective ("whether an explanation is clear") does not cover it. Proposal: mark it held-dependent or narrow it to "Is that clear?".
- **Untaught structure.** The speaking opening "This is a pry bar." uses "This is a + noun", which is not in this lesson's grammar or forms (it first appears in 8).
- **Type prompt.** It says "le mot" but the answer is two words ("pry bar"). Proposal: "le terme".
- **Form 3 gloss.** It describes the example, not the pattern. Proposal: « Is that » + adjectif ; ici, pour vérifier que c'est clair.
- **Objective mode.** It says "recognize", but recall, type, say and write are production.

## Lesson 8

- **Held-decision leakage in speaking.** The card 12 hold says archived speaking added marking and that it must stay separate. The opening ("Mark the damaged area.") and goal ("Use the marking phrase") are built on marking.
- **Role and goal mismatch.** The learner is "describing" but opens with a command. The goal has the learner name plywood, but the partner cue says it ("This is plywood.").
- **Grammar gap.** "This is plywood." (no article) and "This is the damaged area." fall outside form 2, "This is a [singular noun]". Proposal: add an uncountable note or change the cues.
- **New French not labelled.** "Ceci est un panneau." and "Où est le panneau ?" are new French, but provenance labels only the English as new.
  - "Ceci est" is bookish next to the rest. Proposal: "C'est un panneau."
  - "Panneau" alone can read as "sign".
- **Objective omissions.** It leaves out "replace" (the recall activity, and the key verb of held card 15) and the two production tasks.
- **French grammar note.** It drops the "Where is the panel?" example, and "où il se trouve" has no clear antecedent.

## Lesson 9

- **Source meaning.** "Pull" is rendered "Retirez", which merges with "remove" (7 card 14 "retiré"). Proposal: "Arrachez".
- **Write prompt.** It states the task twice. Proposal: « Écrivez en anglais : « Retirez tous les vieux clous. » »
- **Partner cues.** "I use the shovel." switches from third-person description to a first-person claim. "I have my gloves." does not answer "Put on your gloves." Both use untaught structures.
- **Form 2 versus grammar note.** The form gloss says "personnes ou objets"; the grammar note says "personnes". Objects cannot "use", so proposal: persons only.
- **French grammar note.** It omits the "Put on your gloves." and "One … and another …" examples.
- **Hear answer.** The French elides the second verb ("et un autre la brouette"). Proposal: also accept the full-verb variant.
- **Magnet.** "l'aimant" is unheld, though its sense depends on the held magnetic-sweep rows (card 13, readers 6 and 8).

## No finding

- Vous-register is consistent across prompts and glosses.
- No ladder-setup or triage assumption appears in learner text.
- All gates, `reviewed` and `selectedFrench` values are inert.

Source-grounded corrections applied to direct learner wording, scope-dependent activity flags, hypothetical speaking role labels, identification/article patterns, source-kind mapping and linked material/operation decisions. Stronger Arrachez is recorded only as an alternative for qualified review; no force or site procedure was silently added. No gate was opened.
