**Verdict:** not clean yet. All four speaking items have three coherent cue/reply pairs and state the original objective as incomplete, but Foundation 10 has one blocking contradiction and there are several concrete fixes below. I checked only the pasted text; no hashes or files were verified.

## Blocking

1. **F10 gloss contradicts its own provenance and the unchanged dictionary.**
   - Cue 3 says "contrôle or vérification"; `provenance` says "inspection or examen in French"; card 5, its dictionary row and the See activity say `l'inspection`.
   - Fix: revert the gloss to the candidate cognate, e.g. "Inspection means a check. In French: inspection.", and make `provenance` match. If you keep contrôle/vérification, label them as unselected alternates.
2. **F10 cue 3 French support does not support.** It leaves "examination" and "check" in English inside guillemets. Give the French gloss only.
3. **F7 "Two of five source mission questions practiced" is overstated** (in both `provenance` and `holdReason`).
   - The source mission names where, who and when. Only the where question matches; the why-stopping line is an extra Reader 7 item.
   - Fix: "One named mission category (where) practiced; why-stopping is an additional source item; who is held; start-time has no source row."

## Coherence and provenance

4. **F9 cue 2** "Should I stay here or come with you?" assumes the learner is leaving, but the learner stays to write. Use "Should I wait here?"
5. **F9 turn 2** "Wait here, please, while I write the word hammer."
   - It contradicts the lesson's own grammar note (short instruction, "please" at the end).
   - It adds unanchored "while", "write" and "word".
   - Fix: use the exact card 11 "Wait here, please." and move the purpose into the context.
6. **F9 closure.** The final turn is "No, thank you.", a newly authored decline, and "No" has no source row in the pasted Foundation 7–10 packets. `closureProvenance` ("Exact card2") and `closureEnglish` are therefore wrong for that turn. Relabel it, or end on a plain "Thank you."
7. **F9 `sourceAnchors`** omits card 1 ("please"), which is used twice.
8. **F8 `provenance` is stale.** It says the cues are question forms from Reader 1 and Reader 4, but cue 1 is now a repetition request; only cue 2 derives from Reader 4. Also fix the doubled "equipment … or equipment determination".
9. **F8 cue 3** says "both answers", but the first sentence was an opening statement, not an answer. Use "both sentences" / "les deux phrases".
10. **F8 `sourceAnchors`** still lists card 10 ("Not yet."), which no longer appears in any turn. Drop it or note it as the base for "yet".
11. **F10 `provenance`** does not mention that "I need help with the word inspection" is a new extension of card 10, with "the word" taken from held Reader 7.

## Role and parity

12. **F9 and F10 goals say "coworker" / "collègue"** while the roles are practice partners. F10 `goalFrench` also drops the first "coworker" that `goalEnglish` has. Use "partner" / "partenaire" throughout.
13. **F7 goal changes the subject**: "why work is stopping" / "le travail s'arrête". The source is "we" / "on"; use "why we are stopping at eleven".
14. **F10 French learner turns add "le mot anglais"**, which is not in the English targets. Either note it as deliberate cognate disambiguation or align the two.
15. **F10 cue 2 French support** drops "the word" ("le mot").
16. **F9 French support**: put « hammer » in guillemets as F10 does for « inspection ». `contextFrench` drops "hypothetical"; "prop hammer" is the better English anyway.

## Word banks

17. **F10**: there is no bare "inspection" chip, so "What does inspection mean?" cannot be built; the chips yield "What does the word inspection mean?".
18. **F9**: "No." plus "Thank you." cannot produce "No, thank you."
19. **F7**: there is no capitalised "Why are we stopping" for turn 2.

## Housekeeping

20. **Apostrophes are mixed** (’ in new fields, ' in existing ones), including within a single F10 array. Normalise the new fields to the existing straight form.
21. **F7–F9 `internalNotes`** carry F10 boilerplate ("emergency/triage", "clinical vocabulary") that does not apply to them.
22. **F9 `internalNotes`** says card 3 and Reader 1 differ (excusez-moi vs pardon), but the candidate row for Reader 1 already reads "Excusez-moi".

The held-reference lists match the supplement-level holds in all four lessons. I found no readiness answer, safety or work authorization, or qualified approval in any of the speaking items, and the gates are all false.
