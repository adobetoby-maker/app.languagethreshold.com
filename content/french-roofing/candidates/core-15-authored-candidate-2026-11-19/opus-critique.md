Review is based only on the pasted JSON. Packet paths, hashes and source wording are unverified. These are proposals only, with no approval implied.

## Cross-lesson

1. **Provenance field name mismatch (all three).** Activity provenance says "French sense from its conditionalFrench", but the rows carry `candidateFrench`. Either rename the provenance text to `candidateFrench` or confirm the packet field name. Lesson 13 `activity:type` uses a third wording ("Exact English headword; candidate French support"); align it with the others.
2. **`overlap` held/candidate conflict.**
   - 13 `card:7` and `dictionary:7` set `overlap` → `le recouvrement` as `candidate`, non-held.
   - 14 `card:2` and `dictionary:2` hold the same headword pending the approved-product overlap decision.
   - No 13 activity uses it, so this is dictionary-level leakage only.
   - Proposal: hold 13 `card:7` and `dictionary:7` with a reference to 14's decision, or add an explicit generic-sense justification for reviewer decision.

## core-roofing:13

3. **Role leakage in `reader:5`.** "installers" → "Les couvreurs" changes the role from installers to roofers. The foreman/installer role decision is held at `reader:2`. Proposal: hold `reader:5` under the same role decision, or route "poseurs" vs "couvreurs" to the qualified French and trade reviewers.
4. **Objective wording.** "Name … a sequence" reads as describing an installation sequence, which is the held content of `card:10` and `card:14`. Proposal: "Name an edge, a corner and the word *sequence*, and ask which edge or corner someone means."
5. **`sequence` → `la séquence`.** The construction sense may be better served by `l'ordre (de pose)`. Flag this for the qualified French reviewer; don't change it unilaterally.
6. **Speaking turn alignment.**
   - The learner role says the learner asks for clarification, but partner cue 2 ("Which edge do you mean?") makes the partner ask it. The learner then answers "Edge E.".
   - "Which corner do you mean?" appears only as the opening and is not in `expectedLearnerTurnsEnglish`.
   - Proposal: change cue 2 to an answerable statement (e.g., "This edge is marked E.") and put "Which corner do you mean?" in the expected turns.

## core-roofing:14

7. **Internal note in learner text.** `grammarExplanationFrench` ends with "Ces exemples ne donnent aucune valeur de recouvrement." That is a domain guard, not teaching, and the English version has no equivalent. Move it to `internalNotes`.
8. **Task/answer misalignment.**
   - The objective and `form:3` teach "Where are the manufacturer instructions?"
   - The speaking expected turns use "I need the manufacturer instructions." instead, and the word bank lacks the "Where are…" question.
   - Proposal: make expected turn 2 "Where are the manufacturer instructions?", add it to the word bank, and make partner cue 2 something like "What are you looking for?"
9. **`form:2` "There are no wrinkles."** As a declarative it can read as a site/conformity finding, which the speaking provenance disclaims. Consider a neutral example not tied to the underlayment scene, or label it explicitly as grammar-only.

## core-roofing:15

10. **Missing held refs.** `card:15` hold text explicitly says to "align the question and speaking objective with the source", but `speaking.heldDecisionRefs` omits `card:15`. It also omits `card:11`, the linked "show me … before it is covered" ask. Add both.
11. **`membrane` scope.** `card:2`'s hold says to confirm "product and membrane scope", while `card:3` `membrane` is non-held and anchors the `see` and `say` activities. Either cross-reference `card:2` and state that `card:3` is the generic sense, or route the dependency to reviewer decision.
12. **Internal note in learner grammar text.** "but does not give a value" and "sans donner de valeur" are guard notes. Remove them from both grammar explanations.
13. **Grammar EN/FR mismatch.** "identifies a labelled item" ≠ "un objet déjà désigné". Proposal: "un objet étiqueté".
14. **Speaking roles vs context.**
    - The learner role says "asking for … names", but the expected turns have the learner naming the adhesive.
    - The partner role says "labelled material examples" (physical samples), but the practice context is word cards.
    - Proposal: learner role "identifying and asking about labelled items"; partner role "showing word cards".
15. **French support senses for reviewer.** `le papier protecteur` (vs `film de protection`) and `l'adhésif` (vs `face adhésive`) need qualified French and trade confirmation. They are not held now; no change is proposed beyond flagging them.

Source-grounded corrections applied to generic-versus-product sense scope, installer role propagation, document-question alignment and direct grammar wording. Core13 existing clarification turns were retained and made explicit: the partner’s Which edge question and learner’s Edge E reply are coherent after the learner asks to see an edge; opening is separate from the reply list. No qualified approval is implied.
