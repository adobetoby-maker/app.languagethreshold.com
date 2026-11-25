**Verdict:** nothing in the three speaking blocks gives an equipment-readiness answer, a safety or work authorization, or a qualified approval, and each one explicitly marks the original objective as held and incomplete. Core19 is coherent as written; Core20 and Core21 need the fixes below. This is from the pasted text only; hashes, paths and file state are unverified.

## Corrections, in priority order

**1. Core21, reply 1: article and French ambiguity**
- "What is in picture B?" → "The buckle." contradicts the lesson's own rule that a/an introduces an item, and the context itself says "B a buckle".
- Change the reply to `A buckle.` / `Une boucle.` in `expectedLearnerTurns*`, `expectedAllLearnerTurns*`, both turn sequences and the word bank.
- In `practiceContextFrench`, bare "une boucle" is ambiguous (loop, earring); the frozen recall activity already disambiguates with "du harnais". Use `B une boucle de harnais`.
- `frenchTradeTermNote` lists harness, hard hat and fall protection as review items but omits buckle; add it.

**2. Core21, cue 2: cue and reply ask different things**
- The cue says "Ask me where the hard-hat *picture* is"; the learner asks "Where is the hard hat?"; the answer is "in picture C". Asking where the picture is and answering "in picture C" is circular.
- Change the cue to `Ask me where the hard hat is.` / `Demandez-moi où se trouve le casque de chantier.`
- The learner turn then matches the cue and the frozen form 3. "Only pictures are present" plus the "in picture C" answer keep it picture-position only.

**3. Core20, cue 2: redundant instruction and a French addition**
- The learner has just said "Is this the ridge?", so "Yes. Please name it." asks for a name already given.
- Change it to `Yes. Say the full sentence.` / `Oui. Dites la phrase complète, s’il vous plaît.`
- If you keep the cue, drop "en anglais" from "Nommez-le en anglais": it is not in the English cue and was not in the prior draft.

**4. Role parity (Core20, Core19)**
- Core20 `learnerRole` says "reading picture and word cards", but the context has only pictures A and B. Use `A learner identifying picture cards.` / `…qui identifie des cartes-images.`
- `partnerRoleFrench` is the same string in all three ("qui montre les images de l’exercice"), while the English differs: "picture cards", "cards", "practice picture cards". Align each to its English, for example Core19 `qui montre des cartes-images`.
- The learner is called "un apprenant ou une apprenante" in the roles but "la personne qui apprend" in the Core20 context; pick one.

**5. Core21 French context: "retournée" is ambiguous**
- "C est retournée … la personne partenaire retourne C" uses the same verb for face down and for revealing.
- Use `A et B sont face visible et C face cachée … la personne partenaire retourne C pour la montrer.`

**6. Provenance and scope records**
- **Roof distractor (Core19, Core20):** the contexts use "roof" / "un toit" / "d’un toit", but `sourceAnchors` and `composedSentenceProvenance` cover only wall, nail and ridge. The notes say toit versus toiture is unselected. Add that roof/toit is a newly composed, unspoken, unselected distractor.
- **Core20 nail dependency:** source question 3 (`/sourceDecisionQuestions/2`) names missing "product fastener" detail, and `internalDecisionHolds` mentions fastener. Add an inferred dependency for card:9, scoped "generic nail picture only; no fastener type or pattern".
- **Core21 question 4 anchors:** the correct-use and thumbs-up question is tied to cards 1, 6 and 7. For buckle and hard hat the real dependencies are the candidate-level holds on reader:3 (inspection command) and reader:7 (wearing command). Narrow question 4 to card:1, or state those two links.
- **Internal note accuracy:** the note says the reconciliation only "adds" French support and the seven-turn sequence. It also replaced the Core21 cue 2 ("What are you looking for?" / "Que cherchez-vous ?") and rewrote the Core20 and Core21 practice contexts. Record these.
- **`heldDecisionRefs` order:** the sets match the prior drafts (20, 17 and 19 entries) but are reordered from lexicographic to numeric. Either restore the order or stop claiming the arrays are unchanged.
- **Core19 last note:** it says "archived French Décrivez" differs. The archive itself splits: card13 has Décrivez and reader3 has Expliquez. Say so.

**7. Minor**
- Core19 `goalEnglish` order is reversed against the dialogue (the learner asks where, then identifies). Use `Ask where the wall picture is, then identify it.` with matching French.
- The metalinguistic French glosses in 19 and 20 ("le mot anglais « wall » (le mur)") add content the English cue lacks. Acceptable as support, but label them as gloss additions in `frenchSupportProvenance`.

## Checked and fine
- **Three cues and replies:** each block has three cues and three replies that match the seven-turn sequences, and the word banks cover every learner turn.
- **Picture timing:** the hold-up, switch and turn-over points work with the dialogue in all three.
- **Units:** there are no units or quantities in any turn.
- **Archived-draft descriptions:** each matches the packet text, including Core21 correctly citing the instruction because it has no archived opening.
- **Core21 French noun provenance:** it correctly states that the packet's `candidateFrench` is null for cards 1, 6 and 7.
- **Held refs:** they match the candidate-row holds in all three.
