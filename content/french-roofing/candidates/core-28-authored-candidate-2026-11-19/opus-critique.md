# Shared batch read-only critique

# Review: core-roofing 28–30 (fr-en inert supplements)

These are read-only proposals based only on the pasted JSON. I did not open or check any files or hashes.

## Cross-cutting

1. **Ambiguous provenance.** Every term activity says "French support from source **or** newly composed contextual gloss." Each row should say which one applies. Where `expectedMeaningFrench` equals the row's `candidateFrench`, label it "unreviewed source-derived candidate."
2. **Inconsistent hold reasons for the same source text.** Identical sentences carry different holds, and the generic "product, substrate, role or coverage" boilerplate hides the real reason:
   - L28: card 13 is generic, but reader 3 has the access/final-check hold for the same sentence. Card 11 (gutter check) is generic. Card 16 and reader 9 (yard) are generic, but card 8 has the yard/locale hold.
   - L29: card 10 is generic, but reader 3 has the open-item hold for the same question. Reader 9 is generic but contains "punch list" and should cite the punch-list hold.
   - **Fix:** give each row the specific hold of every held term or task it contains, and make card and reader copies of the same text match.
3. **Double terminal punctuation** in prompts, e.g. `« Les déchets sont ici. ».` Use `« Les déchets sont ici. »`. This affects L28 say/write, L29 write and L30 type/write.

## L28

- **Held text names an active term.** The card 2, 10, 15 and reader 7 holds say "Dumpster, downspout **and gutter** are regional trade senses." But gutter (card 1) is unheld and used in the recall activity. Either remove gutter from that hold text or hold card 1 and drop the recall activity. Don't leave both.
- **Form 1 French doesn't match its example.** The form gives `Le/la/l' + nom est ici`, but the example's French is plural (`Les déchets sont ici`). English *trash* is an uncountable singular ("is"), while French *déchets* is plural ("sont").
  - Add one learner-facing line to the explanation, e.g. "trash est indénombrable et singulier en anglais : *The trash is*; en français : *les déchets sont*."
  - Or change the form gloss to `Le/la/l'/les + nom + est/sont ici`.
- **Speaking roles and turns don't line up.**
  - The learner holds the broom picture but asks "Where is the broom?"
  - After the partner answers "in picture A," the learner's "There is a broom." doesn't respond to anything.
  - Card C (cleanup) belongs to the partner, which is fine, but gutter, debris and trash are on role cards and never used.
  - **Fix:** give picture A to the partner, or reorder to partner "What is in picture A?" → learner "There is a broom." Trim the role cards to the items actually used.
- **Minor:** the type prompt `« les débris »` expects bare `debris`, while French prompts include articles. That's acceptable but should be one stated convention, which matters later for scoring.

## L29

- **Answer doesn't match the question, and it brushes a held decision.** The partner asks "Where is card C?" and the learner answers "The remaining materials are here." That swaps the card for the physical materials and states where the materials are. This sits close to the held storage instruction (card 11 / reader 8), even though the internal note says "no overnight-storage answer."
  - **Fix:** learner says "Card C is here. It says remaining materials." Move Form 3's example to a clearly card-bound sentence, or keep it but drop it from the speaking turn.
- **Form 3 French is wrong.** `Le groupe nominal pluriel + est ici (en français selon le nombre)` should be `Les + nom pluriel + sont ici.`
- **Provenance note leaks into learner text.** The English grammar ends "These are newly composed card-exercise sentences," and the French ends "Ces phrases sont de nouvelles compositions…". Both are provenance notes and belong in internal notes, not learner-facing grammar.
- **Role mismatch.** Card A (task: unfinished) matches the learner's role cards, yet "the partner holds up A first." The calendar picture and "today" are listed but never used. Reassign A to the partner or reword the context, and drop the unused cards.
- **Register and naturalness:**
  - `inachevé` (dictionary/activity) is more literary than reader 4's `n'est pas terminée`. Consider `non terminé` / `pas terminé` for consistency.
  - `La tâche est pour demain` is a calque. `La tâche est prévue pour demain` is more natural.
  - In the grammar, `situe une tâche demain` should be `prévoit une tâche pour demain`.

## L30

- **Mislabelled provenance.** The say target "in the morning" is an exact span of source reader 1 ("In the morning, the foreman…"), but it's labelled "New English/French time-language composition." Label it as an exact source span. Keep the "new composition" label for the type and form sentences only.
- **One term, two French supports.** Briefing is `la réunion d'équipe` in the dictionary and recall activity, but `la réunion d'information` in the type prompt and speaking opening. Reader 1 uses `la réunion`. Pick one (the Spanish evidence, *reunión informativa*, leans toward *d'information*) and apply it everywhere, or present the second as an explicit variant.
- **Role mismatch.** The learner holds picture A (briefing) yet asks the partner about it, and the partner confirms "Yes." Give A to the partner, or have the partner ask about A.
- **Terminology card 9 mismatch.** The tarp review question is "Weather and access conditions," but the row hold is the roof-system/product-scope hold, and that hold names platelage, sous-couche and solin but not bâche. Align the hold so tarp carries the weather/tarp-access hold from card 13 / reader 7.
- **Minor French:** in `goalFrench`, `Interrogez sur la réunion matinale` should be `Posez une question sur la réunion du matin`.

## No issues found

- Held-row exclusions in activities and forms: none of the activities or forms uses a held card or reader row.
- The L30 capstone language conflict and the install/instalación conflict are recorded explicitly and left unresolved.
- No ladder setup, tie-off, stop-work or completion verdicts are asserted in learner text.
