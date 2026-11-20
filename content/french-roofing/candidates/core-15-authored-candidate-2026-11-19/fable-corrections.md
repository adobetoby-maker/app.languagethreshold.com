# Fable critique and source-grounded corrections

# Review of core-roofing 13–15 (fr-en), pasted JSON only

I checked nothing against the source packets, hashes or files, so "exact source" claims are checked only against the pasted `candidateRows`. These are read-only proposals, not an approval; I found no held English or French text copied into learner fields.

## Cross-lesson

1. **Generic-sense flags are applied unevenly.** `overlap` (13) and `membrane` (15) carry `genericSenseOnly` and a linked decision ref, but other non-held terms that sit inside held rows do not. Propose the same treatment for:
   - 13 `edge` (cards 1, 3), `corner` (card 13) and `install` (card 10).
   - 14 `inch` (cards 2, 10) and `fastener` (cards 6, 14).
   - 15 `adhesive` and `backing paper` (card 12).
2. **Pending-sense flags sit only on dictionary rows.** `sequence` (13), `adhesive` and `backing paper` (15) are pending in `dictionaryMappings`, but the matching candidate rows and the recall/hear activities do not say so. Mirror the flag.
3. **Speaking structure differs.** Only 13 has `turnSequenceEnglish`. Lesson 15 has three partner cues but two expected learner turns, so the cue-to-reply mapping is ambiguous.
4. **Prompt templates drift.** Lesson 14 uses « Dites la phrase anglaise pour » and « Écrivez une phrase anglaise pour »; 13 and 15 use « Dites/Écrivez en anglais : ». « No wrinkles. » is also not a *phrase* in the French sense.

## Lesson 13

1. **The speaking scenario is incoherent.** The context labels one edge (E) and one corner (C), so "Which corner/edge do you mean?" has nothing to disambiguate. Propose two of each (C1/C2, E1/E2) and a partner first line that mentions a corner before the learner's opening.
2. **The exchange never resolves.** After "Edge E." the learner repeats the same ambiguous question and the sequence ends unanswered, so the closure "that is clear" does not follow. Propose "Can you show me edge E?" as the final turn, plus a partner reply. "Edge E." is also missing from the word bank.
3. **`heldDecisionRefs` may be incomplete.** Cards 12 and 13 are held sequence steps, and card 13 concerns the corner used here. Add them or record why they are excluded.
4. **Objective and tasks diverge.** The hear target `install` and the polite-request forms are not in the objective, and `sequence` appears in one recall only.
5. **Type provenance is off-pattern.** "Exact English headword" should read "Exact source English from card:8; French sense from its candidateFrench."
6. **Role wording.** "Requesting an edge view" reads as a drawing-view term; propose "asking to be shown an edge".

## Lesson 14

1. **"No wrinkles." is treated as free-standing.** Card 12 and reader 4 are non-held, but in the source the phrase is the tail of the held roll-out instruction (card 11, reader 3). Add a dependency link to card 11, or a note like the one on form 2.
2. **Grammar and task do not match.** "There are no + plural" is taught but never practised, and the say target "No wrinkles." fits none of the three forms.
3. **« Sans plis. » needs French review.** It reads as a modifier; « Pas de plis. » is the natural stand-alone equivalent.
4. **Form 2 provenance is wrong.** It says "from source headword", but card 12 is a phrase.
5. **« le pouce » is ambiguous out of context.** Propose « le pouce (unité de mesure) ». `inch` is also absent from the objective.
6. **Goal and target differ.** The goal says "ask for" the instructions; the sentence asks where they are. Align it to "ask where".
7. **The French grammar note omits the examples** that the English one gives.

## Lesson 15

1. **Adhesive is reframed as a separate material.** In the source it is the face the backing paper peels from (reader 4). Card B and the cue "What is this material called?" present it as a discrete product, which is a method assumption. Propose "What does card B say?"; this also fixes the cue naming no card.
2. **Form 3 over-generalises.** "What is the [noun]?" with « Quel/quelle est le/la + nom ? » goes beyond the explanation, which covers only the width question. Narrow it to a dimension noun.
3. **Elision is missing in forms 1–2.** « le/la » should be « le/la/l’ », since the example is « l’adhésif ».
4. **Speaking coverage.** `membrane` is anchored and in the word bank but never used; the width question in the objective is absent; "This is the adhesive." is missing from the word bank.

## Final self-check

Applied generic/pending sense flags, explicit speaking turn mapping, narrow grammar frames and provenance corrections. Core13 now has multiple labelled edges/corners and a resolved exchange; Core14 Say uses a visibly new grammar expansion and keeps exact source faces separate; Core15 uses word-card questions without presenting adhesive as a separate physical product. The natural standalone French proposal Pas de plis remains unreviewed. Full source speaking remains held-dependent. Source anchors, exact English faces, stable IDs, null selections/audio and false gates are independently checked; no AI qualified approval.
