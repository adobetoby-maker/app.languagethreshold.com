# Shared batch read-only critique

# Review: core-roofing 25–27 (fr-en). Read-only correction proposals.

This review covers only the pasted JSON. I did not check packet files, hashes or anchors against source. No approval is implied.

## core-roofing:25 (Falling Debris)

1. **Inconsistent French sense for cone.** The `hear` activity expects `le cône`. The candidate row, the dictionary mapping and the `write` activity use `le cône de signalisation`, and speaking uses `le cône`. Pick one learner-facing gloss for card 8 and use it everywhere. Since the row is the candidate, I propose `le cône de signalisation` in `hear.expectedMeaningFrench`, `candidateOpeningFrench` and `partnerCueSupportFrench[0]`.
2. **Inconsistent French sense for hard hat.** `goalFrench` and `contextFrench` say `casque`. The card, dictionary and expected turns say `casque de chantier`. Align both to `casque de chantier`.
3. **Goal does not match the turns.** `goalEnglish` says "Locate cone and hard-hat pictures", but the learner only locates the cone. The hard hat is identified with "Is this a hard hat?" Proposed: "Locate the cone picture, identify the hard-hat picture and read the printed word danger." Mirror this in French.
4. **Quoting of the printed word is inconsistent.** The learner turn quotes it (`"danger"`), but the partner cue (`It says danger.`), `contextFrench` (`porte danger`) and the French cue (`Elle indique danger.`) do not. Because "danger" is also a French word, unquoted text makes it unclear which language is being read. Quote it everywhere, e.g. `porte « danger »` and `Elle indique « danger ».`
5. **Nested quotation marks in the `say` prompt.** `« La carte indique « danger ». »` nests guillemets. Use `« La carte indique “danger”. »`.

I found no leakage from held rows. Hard hat, cone and danger are used only as picture or printed-word vocabulary, with no PPE-sufficiency, clearance or warning meaning.

## core-roofing:26 (Document Deck Repairs)

1. **Cue and answer don't match.** The partner asks "What does picture A show?" and the expected answer is "The area is damaged." That answers a description prompt, not a "what does it show" question. Choose one fix:
   - change the cue to "Describe the area in picture A." / « Décrivez la zone sur l’image A. », which keeps form 3; or
   - change the answer to "It shows a damaged area."

   I recommend the first, because the lesson teaches form 3.
2. **Objective wording.** "Ask for a photo card" overstates the task. The learner only asks "Where is the photo?" Proposed: "…identify pictures and ask where a photo is."
3. **`reader:6` French adds meaning.** The source says "measures the section", but the French reads `mesure la partie réparée`, which adds "réparée". Proposed: `Un ouvrier mesure la partie et communique la mesure.` Alternatively, keep the addition and record it as a contextual addition in provenance.
4. **Unquoted English label.** `contextFrench` has `B est une photo portant repair photo`. Quote the English label: `portant « repair photo »`.

I found no leakage from held rows. Deck, sheathing and covered area stay out of the learner text, and the `say` provenance correctly makes no documentary-sufficiency claim.

## core-roofing:27 (Inspect Vents & Flashing)

1. **The objective promises a skill the lesson doesn't practise.** The objective says the learner will "ask What have you already checked?", but the only activity with that sentence is receptive (`hear`). It is also absent from speaking. Choose one fix:
   - add a productive `say` or `write` activity anchored to card 14; or
   - reword the objective to "understand the question What have you already checked?"
2. **Internal note in learner-facing text.** "without asserting an inspection result" in `candidateObjectiveEnglish` is a domain or guardrail note. Move it to `internalNotes`. The grammar explanation's "it does not state a result" can stay because it is a grammatical point.
3. **The `say` task is ambiguous.** The prompt `« la fissure »` uses the same citation format as `le contreplaqué` → `plywood` elsewhere, but here the expected answer is "the crack". A learner answering "crack" would be marked wrong under the same convention. Choose one fix:
   - make the article explicit in the prompt; or
   - use a sentence target such as "This is a crack." / « C’est une fissure. », which matches speaking.
4. **`hear` provenance contradicts itself.** It says the sentence is an exact source quotation, then that the "present perfect question is labelled as new grammar". Proposed: "Exact source English, card 14 (reader 3 context). The present-perfect grammar explanation is new composition. No audio selected."
5. **Form 2 notation is misleading.** `This is [a/an + count noun or mass noun]` reads as if a/an can go before a mass noun. Split it into `This is a/an [count noun]. / This is [mass noun].`
6. **Generic hold text on some rows.** Card 4, card 12, reader 1 and reader 2 carry the generic "Linked unresolved product, substrate, role or coverage sense…" text. It doesn't state the actual open question (the roof-penetration sense versus `traversée de toiture`, and the walk-through role). Replace it with a specific reason so reviewers can trace it. The terminology proposal already states the question.

I found no leakage from held rows. Sealant appears only as a material noun, with no sealing instruction. Crack is not linked to leak or pipe boot.

## Cross-lesson

- **`internalNotes`** contains the same "Full exact source objective…" line twice in all three lessons. Its "fall-protection/source decision" wording also doesn't fit lessons 26 and 27. Remove the duplicate and make the note lesson-specific: falling-object control for 25, deck-repair record for 26, penetration inspection for 27.
- **No ladder setup method or triage decision** is assumed anywhere. The held source objectives are kept as incomplete provenance and are not replaced by the vocabulary subsets.
