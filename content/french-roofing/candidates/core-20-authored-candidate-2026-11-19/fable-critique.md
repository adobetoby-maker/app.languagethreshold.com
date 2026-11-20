# Shared batch read-only critique

Review of the pasted JSON only; I did not check the packets, paths or hashes, and the "from packet conditionalFrench" and "source-checked" claims are unverified. These are AI proposals, not qualified approval.

## Cross-lesson

1. **Article policy in answers is inconsistent.** L19 maps « le mur » to `wall` in recall but to `the wall` in type, while L20 maps « le clou » to `nail` and L21 maps « la protection contre les chutes » to `fall protection`. Proposal: use bare nouns for word tasks, so L19 type becomes `wall`, or make the prompt ask for the phrase explicitly.
2. **Hear tasks differ in type.** L19 says « choisissez », but L20 and L21 say « donnez son sens français », which is free French production against an unreviewed key. For L21 that key (`casque de chantier`) is itself an open locale choice. Proposal: « choisissez » in all three.
3. **« Est-ce… ? » and « C'est… » cues also admit "Is it…?" and "It is…".** Proposal: accept those variants or cue "this" in the prompt.
4. **"roof" is rendered two ways.** L19 reader:2 uses `le toit` and L20 reader:1 uses `la toiture`, with no note. Proposal: record it as an open sense choice.
5. **Grammar support disagrees with the forms.** L20 and L21 say "the" corresponds to `le/la/les`, while the forms use `le/la/l'`. Proposal: `le/la/l'/les`. L19 also calls "Is this the" identification in the explanation but « demander confirmation » in form 2.
6. **Partner cues use untaught English with no French support.** Examples are "picture", "Please repeat the word", "What else?" and "What is in picture B?".
7. **Internal notes are mis-scoped boilerplate.** The "finish sense newly held" note appears in L19 and L21, which have no finish card. The fall-protection disclaimer appears in L19 and L20.

## L19

- **Speaking deixis:** the partner holds up picture B throughout, yet the learner says "This is the wall." Proposal: add that the learner points to A, or the partner holds up A.
- **Hold scoping:** card:14 and reader:7 are the same sentence with different holds. Sentence rows containing held terms lack those term holds: card:12 and reader:6 (flashing), card:13 and reader:3 (sidewall, flashing), card:11 and reader:5 (course). All stay held, but clearing the listed reason alone would wrongly release them.
- **Verb asymmetry:** `bend` is held as command-dependent, while L20 releases `cut` as a base-form verb although its only source use is held card:10. Proposal: apply one standard.

## L20

- **`ridge` → `le faîtage`:** the faîte/faîtage choice is unrecorded. It pre-commits the held compounds (`bardeau de faîtage`, `évent de faîtage`), and reader:2 uses "ridge" for the covering, not the line. Proposal: add an open-sense note or hold.
- **`nail`:** no pasted source sentence uses it, so noun versus verb (`clouer`) is undisambiguated. That is the same condition that put `finish` on hold, and three activities plus the speaking rest on it.
- **Speaking:** the partner confirms "Yes." and then asks "What is this?" about the item just confirmed. Proposal: restructure, for example a "No" path or the question first.
- **reader:1:** « terminé » pre-selects a completion verb while `finish` is held.
- **Provenance:** the hear activity cites "card9" and does not label its prompt as new. L19 recall has the same gap.

## L21

- **Speaking, cue and response:** "Yes. What else?" does not elicit "Where is the hard hat?".
- **Speaking, word bank:** it lists "This is the buckle.", which is never used; the turn is "The buckle.". It omits "This is the hard hat.", which is expected.
- **Speaking, anchors and forms:** card:5 is anchored but "fall protection" is never used. No form covers "This is the", and the deixis problem from L19 recurs with picture C.
- **Form 3:** the provenance calls a location question "Identification question only".
- **Recall:** « Rappelez le mot » is a calque. Proposal: « Donnez ». Also « la boucle » can mean loop. Proposal: « la boucle (du harnais) ».
- **Hold scoping:** the ancla/anclaje hold sits on card:8 (fall hazard) and card:10, but not on card:3 (roof anchor) or card:12. The "don't freelance" idiom is unflagged. Several holds are generic and begin with a stray leading space.
- **`fall protection`:** the locale variant (`antichute`) is unrecorded, unlike hard hat.

## Passes

- `heldDecisionRefs` match the held rows in all three lessons.
- No held-row French appears in learner text.
- There is no ladder-setup or triage content.
- The vous register is consistent.
- Domain notes stay in internal fields.
- All gates are false.
