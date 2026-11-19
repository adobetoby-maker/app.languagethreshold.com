# Read-only review of core-roofing 1–3 (fr-en): proposals only, nothing edited or approved

**Scope:** I checked "source-exact" labels against the `sourceEnglish` rows in the payload; I did not open the packet files or verify the hashes. Every source-exact English target matches its anchored row verbatim, and no activity directly anchors a held row. The payload contains no ladder-setup or triage content.

## Cross-lesson

1. **Internal caveats inside learner dialogue.** The partner cues carry the provenance disclaimer in the modelled English: "For this practice image, …", "For this practice card, yes.", "For this practice diagram, …". Proposal: use plain cues ("It is sloped." / "Yes. This is underlayment.") and keep the hypothetical framing only in `scenarioProvenance`.
2. **Article mismatch in typed and spoken answers.** Prompts such as "Tapez en anglais : le toit en pente" and "le mur" expect bare "sloped roof" and "wall". Proposal: accept "the …" as an alternate, or state the convention in the prompt.
3. **Same sentence, different provenance labels.** "Is this underlayment?", "This is plywood." and "Where is the chimney?" each carry one label on the activity and another on the form. Proposal: one precise label per sentence, in the form "New composition: [frame] + source headword [anchor]".
4. **Foreman role hold is dangling.** L3 reader:5 cites a "linked foreman versus crew-lead role decision", but no row states that decision. The other foreman rows (L1 reader:2 and 5, L2 reader:5 and 7) do not cite it. Proposal: name one originating row and cite it from every foreman row.
5. **Format drift.**
   - Prompts use guillemets in L2 and L3 but not in L1.
   - Apostrophes are mixed straight and curly ("C'est" / "c’est", "l'équipe" / "s’il"), which matters if matching is ever string-based.
   - French uses both "toit" and "toiture" (L3 reader:1).
   - The scene is called "image", "diagram", "cards" and "samples" within single lessons.

## Lesson 1

6. **Unlabelled alternate.** In recall, "roof slope" sits under `source-exact` but is not in the source, and treating pitch and slope as equivalent is a trade judgment. Proposal: label it as a new, unreviewed alternate pending trade review, or remove it.
7. **Internal voice in the English grammar text.** "Roof pitch is taught as a fixed noun+noun term" is an authoring note; the French version is direct. Proposal: "'Roof pitch' is a term made of two nouns."
8. **Grammar gap.** The rule taught is adjective before noun, but both sentences use the adjective after "is". Proposal: add "After 'is', the adjective stands alone: 'The roof is flat.'"
9. **Imperative untaught and outside the objective.** "Check the roof pitch before we start." is an imperative with a time clause; the objective says "Recognize … questions and statements". Proposal: add a line on the imperative, or widen the objective.
10. **"We" is not cued.** "Avant de commencer" does not prompt "before we start". Proposal: "avant que nous commencions", or keep the French and treat the alignment as loose in an internal note.
11. **Speaking changes the speech act.** The L1 holds describe the source task as telling a crew member; the candidate has the learner asking. "Narrower" understates this. Proposal: relabel it as a different speech act. Alternatively flip the turns so the partner asks card:14 and the learner answers with reader:3, both source-exact.
12. **Unused word-bank item.** "roof pitch" is in the word bank but the goal never uses it.

## Lesson 2

13. **Indirect held-decision leakage on "la sous-couche".** Card:2 and card:13 are unheld. The felt/synthetic hold asks whether "sous-couche" consistently names the layer rather than one product. See, hear and speaking all depend on the term. Proposal: link card:2 and card:13 to that hold, or record in an internal note why the bare term is independent.
14. **English and French grammar texts diverge.** The French omits the inversion ("Reverse is and this"), "+ noun" and "one item". The English leaves the forms unquoted. Proposal: align the two and quote the forms.
15. **Article contrast untaught.** "This is plywood." has no article where French has "du"; "Where is the plywood?" has one. Proposal: add one line on material nouns without an article.
16. **"C'est" does not cue "This".** "C'est du contreplaqué." also yields "It's plywood." Proposal: accept that alternate or prompt with "Ceci est …".
17. **Speaking narrower than the objective.** "Where is …?" is in the objective but absent from the speaking task and word bank.
18. **Duplicate cue fields.** `partnerCueEnglish` repeats `partnerCuesEnglish[0]`; L1 and L3 have only the singular field.

## Lesson 3

19. **Number mismatch on the lesson's own grammar point.** The learner asks "Where are the valleys…?" and the cue answers "the valley is at the front". Proposal: "One valley is at the front." or "The valleys are at the front.", labelled new.
20. **Flashing request has no partner response.** The goal includes "Show me where the flashing goes." but no cue answers it. Any real answer needs a placement claim that sits in held rows (reader:2, reader:4, card:10). Proposal: drop it from the goal, or add a labelled non-specific cue such as "The flashing is marked here."
21. **Hardest structure untaught.** "Show me where + subject + verb" has no inversion, yet the grammar text says "Where starts a location question". Proposal: add one sentence on word order after "Show me where".
22. **"flashing" is never introduced alone.** It is in the objective and the say activity, while the type slot teaches "wall", which is not in the objective. Proposal: use card:1 "flashing" in the type slot.
23. **Reader:6 French shifts meaning and its note is wrong.**
    - "Une personne de l'équipe" is "a person on the crew", not "a worker".
    - "indique" weakens "points to", although the note says the verb is retained.
    - The note calls the row "English support"; it is French support.
    - Proposal: label the French as a new gender-neutral rewrite, tie it to the role decision, and consider "montre".
24. **Stale disclaimer.** The chimney write activity says "no wall-placement claim". Proposal: "no flashing-placement or site-location claim".
25. **Spatial shift in card:15 and reader:8.** "At the valley" is rendered "dans la noue" (in). Proposal: "au niveau de la noue".
26. **Minor.**
    - The card:12 note calls an imperative request a "location question".
    - The word bank's "Where are the valleys?" is an unlabelled truncation of card:13.
    - The objective's "shown" does not match "goes".

Source-grounded self-check applied plain partner cues, objective/form/grammar alignment, precise linked provenance, generic-material scope limits, hypothetical dialogue turn completion and spatial French corrections. Unreviewed roof-slope alternate removed. Qualified review and all registration/selection gates remain closed.
