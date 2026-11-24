# Review: master-roofing 13–15 (fr-en)

I reviewed only the pasted JSON. I did not open the packets or check hashes. Everything below is a read-only correction proposal; nothing here is approved. All source faces stay held.

## Cross-cutting

**X1. French meanings are given for held faces that have no lexical proposal.** Each `expectedMeaningFrench` below supplies a French sense for a held source face, but no `lexicalProposals` row exists for that card. This effectively selects a French answer for a held face.
- L13 card 14 "the exact time" → *l'heure exacte* (in the see, hear and write activities and in speaking)
- L14 card 19 "What can we change so it doesn't happen again?" → *Que pouvons-nous changer…* (in say and speaking)
- L15 card 9 "the ground" → *le sol* (recall)
- L15 card 20 "Do you copy?" → *Vous me recevez ?* (in hear, speaking and form 3). Form 3's provenance says "French radio sense remains proposed," but no proposal row exists for it.

**Fix:** For each one, either add an explicit pending `lexicalProposals` row or replace the item with a newly composed one built from proposed vocabulary. The second option is required for L14 card 19 and L15 card 20, because both are whole held source sentences (see L14.1 and L15.2).

**X2.** The template `internalHold` text "ordinary/clinical vocabulary" is attached to non-clinical words such as *sky*, *sidewalk* and *pickup truck*. **Fix:** Change it to "ordinary vocabulary" where it applies.

**X3.** Apostrophes are mixed. For example, "Let’s" is curly while "doesn't" is straight. **Fix:** Pick one style for all learner-facing English.

## Lesson 13

**13.1 "The printed report was showing the exact time" contradicts the scenario and leaks held content.** The practice sheet is described as blank, with labels only. The sentence instead asserts that a report displayed a time value. That echoes held reader 12–13, where the exact time is unknown and the report says "approximately 10:15." It is also an unidiomatic stative progressive, and its card 2 anchor doesn't match its wording ("printed report"). **Fix:** In the hear and write activities, use "I was reading the label 'Exact time.'" (*Je lisais l'intitulé « Exact time ».*)

**13.2 "My partner was writing the exact time" misleads the learner.** The English, and even more so the French (*écrivait l'heure exacte*), reads as recording a real event time. The `internalReferentNote` clarification never reaches the learner. **Fix:** Use "My partner was copying the label 'Exact time.'" (*recopiait l'intitulé*) in the turns, the word bank and form 3.

**13.3 Learner text implies a real report.** "the printed incident report" (in say, speaking and form 1) suggests an actual report, which conflicts with the "practice sheet" in the objective and context. **Fix:** Use "the incident-report practice sheet" (*la fiche d'exercice de rapport d'incident*).

**13.4 Form 3 gloss is wrong.** *rédigeait* means "was drafting/composing," which doesn't match *écrivait* elsewhere or the copying task. **Fix:** *recopiait (action en cours)*.

**13.5 Inconsistent grammar term.** The explanation says *Passé progressif anglais*, but `goalFrench` says *prétérit progressif*. **Fix:** Use *prétérit progressif (be + -ing)* in both places.

**13.6 Mislabelled prompt.** In the write prompt, "Traduction naturelle :" introduces the French model sentence, not a translation. **Fix:** Use "Phrase à rendre en anglais :".

## Lesson 14

**14.1 The say activity and final speaking turn use held card 19 verbatim.** That sentence is the source's prevention question, and both places pair it with French. The say prompt also asks the learner to "repeat in English" when no English was shown. That makes it a translation task, and *la question de la langue* is garbled French. **Fix:** Use a new composition, "How can I copy the word correctly next time?" (*Comment puis-je recopier le mot correctement la prochaine fois ?*), with the prompt "Dites en anglais : …". Then update the speaking `sourceAnchors` and the partner cue to match.

**14.2 The speaking logic contradicts itself.** "I nearly copied the wrong word" means the copy was correct. "I could have copied the word correctly" then implies it wasn't. **Fix:** Change the cue to "What could have happened?" and the answer to "I could have written the wrong meaning." (*J'aurais pu écrire le mauvais sens.*) Update the form 1 example to match. This keeps the past-possibility sense without an injury counterfactual.

**14.3 *pedestrian* has two French glosses.** The write activity glosses it as *passant*, while recall and proposal 2 teach *piéton*. **Fix:** Use *Le piéton marchait sur le trottoir.*

**14.4 (Minor) Tense mismatch.** The context says "The learner has nearly copied," but the turns say "nearly copied." **Fix:** Use simple past in both, since *nearly* with the present perfect is marked.

## Lesson 15

**15.1 The say prompt doesn't match its answer and leaks a held face.** The prompt asks the learner to say *S'il commence à pleuvoir, nous descendons*, which is French for held card 15, a storm-descent instruction. The expected answer is "If you hear the phrase, repeat it." **Fix:** Change the prompt to *Dites à voix haute en anglais : Si vous entendez la phrase, répétez-la.*

**15.2 "Do you copy?" is a held source face, and its French sense is selected without a proposal (X1).** The learner text also never teaches *copy* = "receive (radio)" directly. **Fix:** Either add a pending proposal row and teach the gloss explicitly in the learner text, or swap in a newly composed phrase, for example "Can you hear me?" (*Vous m'entendez ?*), and update the hear activity, speaking turn 1 and form 3.

**15.3 The *le sol* gloss for "the ground" has no proposal (X1).** **Fix:** Add a proposal row, or swap in proposed vocabulary such as "the radio" (*la radio*, proposal 1).

**15.4 (Minor) The write sentence is near-vacuous.** In "If the printed word is sky, I will read it," the condition doesn't affect the outcome. **Fix:** "If the printed word is sky, I will say *le ciel*." This uses proposed vocabulary only.

**15.5 (Minor) The scenario reads as a field radio exchange.** `practiceContextEnglish` describes "a radio exchange." **Fix:** "Language practice: reading a printed phrase card aloud."

**15.6 (Locale) *le pick-up* may need a Québec variant.** It is fine for France, but the locale decision is held, so note that a Québec-French variant may be needed.
