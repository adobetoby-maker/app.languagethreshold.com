# Shared batch read-only critique

Review is of the pasted JSON only: I did not open the packets or check the hashes or the exact source text. These are read-only proposals, not an approval.

## Cross-lesson

- **Speaking has no French support.** All three `speaking` blocks carry `frenchSupportProvenance`, but goal, context, cues and turns are English-only. Sentences that appear only there have no French meaning anywhere, such as "Where is card C?", "Picture C shows wind." and "Where is the shade card?". Add French glosses or correct the label.
- **Role term chosen silently.** L24 readers 3 and 4 use « le contremaître » for foreman with no role or locale note, whereas "competent person" is held as a role. No France/Québec locale is declared; it also bears on « bottes », « crème solaire » and the heat-exhaustion options.
- **Sentence-level French lacks provenance.** L23 reader 1, L24 card 15 and L24 reader 1 have no `candidateFrenchProvenance` (archived or new?), unlike L23 reader 5 and L24 readers 3–4.
- **Two consecutive learner turns end every sequence.** The closure follows a learner turn with no partner turn between; either merge them or add a partner line.
- **Card and reader English differ for the same line.** L22 card 13 "Check the lifeline for damage." versus reader 5 "Check whether the lifeline has any damage.", both labelled `sourceEnglish`. Confirm each is exact source.

## Lesson 22

- **"Where is card C?" breaks the taught frame.** It has no article, but form 1 and the grammar note teach "Where is the + noun". The partner's reply ("Card C. What does it say?") also does not answer a where-question. Proposal: learner "Show me card C." or partner "Card C is here. What does it say?", plus a note on labelled nouns.
- **Form 1 provenance is imprecise.** It is labelled a new composition, but the frame matches held card 12 ("Where is the competent person?"). Say so: frame parallels held card 12, held term excluded.
- **Goal contradicts context.** `goalEnglish` says "rope and harness cards"; the context has pictures A and B, and only C is a card.
- **Write activity alignment.** The prompt is not wrapped in « » like its siblings, and « inspection » in the prompt gives the answer. Form 3 has no quotation marks but the example does, and the final-period placement is undefined for a typed answer.
- **Fall-distance options need per-option provenance.** « la distance libre de chute » is listed as a peer option although the hold flags it as a possible clearance sense. « la hauteur de chute » is a different sense with no stated origin.
- **Hold text gap.** The Spanish evidence alternates « anclaje » (cards 1, 11, 14) and « ancla de techo » (card 10); record that in the anchor hold.
- **Inspection sense.** « l'inspection » versus « vérification/contrôle » for equipment checks is worth an explicit question for the qualified-sense review.

## Lesson 23

- **Wind is never taught.** It is in the objective and the speaking, but no activity covers it.
- **Form 3 is never practised.** "Picture B shows…" carries the whole speaking task; the `type` activity is the single word "rain". Proposal: make `type` or `write` "Picture C shows wind."
- **French form glosses hide the article contrast.** « Il y a + nom indénombrable » and « L'image + lettre montre + nom » omit the French article that English drops. Use « Il y a du/de la/de l' + nom » and « montre le/la/du/de la + nom », with a one-line note.
- **"There is dew." provenance.** The frame comes from unheld reader 1 ("there is still dew on the roof"); cite reader 1 instead of "new".
- **"It is wet." sits close to held card 13** ("The roof is wet."). It is acceptable with no referent; keep it that way.
- **Adjective answers.** « mouillé » and « glissant » should accept feminine forms or state that the masculine is the citation form.
- **Pictures start at B.** There is no picture A; relabel or add one.
- **Boots.** The internal note declares an open terminology question, but the row is a plain candidate. Move it to `terminologyProposals`.

## Lesson 24

- **Source English and Spanish diverge on card 10.** "Take a water break every hour." versus « Tomen agua cada hora. » (drink water, no break). The hold does not record this.
- **"Respectful" is misplaced in the English objective.** English "How do you feel?" has no register marking; that belongs to vous/usted. Move it to the French support note.
- **Conflicting descriptions of the same question.** Reader 4 provenance calls it a "symptom question"; the `write` activity calls it "neutral… no symptom assumption". Align on "wellbeing question".
- **Pragmatic drift.** As the opener to a card exchange it reads as a greeting ("How are you?"). Add a context line that it is a wellbeing check, not a greeting.
- **Forms 1 and 2 are unpractised.** The compounds "shade card" and "water card" are unexplained, and "card" is not taught in this lesson.
- **Word bank mismatch.** "This is the water card." is never used. The expected turn "Thank you." is absent from the bank and has no provenance label.
- **"Rest" proposal overstates.** It claims there is no noun/verb question, but reader 9 ("Hydration and rest in the shade") reads as a noun. Keep « le repos » as the noun option tied to reader 9 and « se reposer » for cards 7 and 13; a single-option list reads as a de facto selection.
- **Card 15 is unheld but embedded in held reader 8.** If it stays, add « Prévenez-moi… » as an option closer to « Avíseme ».

## Clear

- `heldDecisionRefs` match the held rows in all three lessons.
- No activity or speaking turn uses a held term.
- No ladder-setup method or triage decision appears in learner text.
- Vous register is consistent throughout.
- Gates, `selectedFrench` and `audioScript` are consistently inert.
