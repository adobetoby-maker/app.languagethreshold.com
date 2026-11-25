# Critique: French Roofing Core 19–21 speaking and original-scope reconciliation

**Scope:** This is a read-only review of the pasted text only. I could not verify hashes, files or pins. I propose no changes to source faces, activities, forms, dictionary mappings, candidate rows, holds or gates.

## Blocking (Core 21 exchange coherence)

**1. Picture B is never shown, so the learner cannot answer "The buckle."**
- The context says the partner holds up A, then C after the last cue. B is never visible.
- **Fix in `practiceContextEnglish`/`French`:** "Pictures A and B lie face up; picture C is face down. The partner points to A, then to B. After the last partner cue, the partner turns over picture C."
- French: « Les images A et B sont visibles ; l'image C est retournée. Le partenaire montre A, puis B. Après sa dernière réplique, il retourne l'image C. »

**2. Cue 2 ("Do you have a question?") doesn't elicit "Where is the hard hat?"**
- The learner has no reason to ask about the hard hat specifically. The previous cue, "What are you looking for?", had the same gap.
- **Fix:** Change cue 2 to "Ask me about the hard hat." / « Posez-moi une question sur le casque de chantier. »
- Update `partnerCuesEnglish[1]`, `partnerCueSupportFrench[1]` and both `turnSequence` arrays at index 3.

**3. Keep the question framed as a picture, not as real gear.**
- The `goalEnglish` says "hard-hat picture", but the turns say "Where is the hard hat?". Read on its own, that can sound like locating real equipment before access.
- The partner's answer, "The hard hat is in picture C.", already anchors it to the cards. Fix #1 strengthens this.
- **Fix:** Add to `scenarioProvenance`: "'Where is' refers only to card position, never to equipment availability or access."

## Provenance corrections

**4. Core 21's French support has no source or archive basis.**
- The Core 21 packet cards have `candidateFrench: null`, no `archivedFrenchEvidence`, and no card-level French in the archived draft. Core 19 and 20, by contrast, copy from `conditionalFrench`.
- The speaking `frenchSupportProvenance` uses the same wording as Core 19 and 20, which hides this difference.
- **Fix:** Append "Core 21 French nouns (harnais, boucle, casque de chantier) are model-proposed only; the source packet and archive supply no French for cards 1, 6, 7."

**5. The Core 19 internal note on Describe vs. Explain is incomplete.**
- The Spanish is *Expliquen* in both card 13 and reader 3. The divergence exists only in the English translation (card 13 says "Describe") and in the archived French (card 13 says *Décrivez*).
- **Fix:** Reword the note: "Spanish uses Expliquen in card13 and reader3; English card13 'Describe' and archived French 'Décrivez' diverge from it. Retained for qualified source review."

**6. Core 19 notes reference Core 20.**
- The note "cut in Core20 is supported by explicit Spanish infinitive Cortar…" is out of scope for Core 19.
- **Fix:** Remove that clause from the Core 19 `internalNotes`.

## French parity

**7. Partner gender wording is inconsistent (all three lessons).**
- `learnerRoleFrench` is inclusive ("un apprenant ou une apprenante"), but `partnerRoleFrench` and the context French use only the masculine ("Un partenaire…", "il montre", "il passe").
- **Fix:** Use "Une personne partenaire qui montre…" and replace "il" with "la personne partenaire".

**8. Core 20 `goalFrench` doesn't mark "ridge" as English.**
- It reads "…répéter le mot ridge."
- **Fix:** "…répéter le mot anglais « ridge »." This matches the cue support.

**9. Core 20 cue 2 French is ambiguous about the answer language.**
- "Nommez-le, s'il vous plaît." could invite an answer in French.
- **Fix:** "Oui. Nommez-le en anglais, s'il vous plaît."

**10. Core 19 grammar label is inconsistent.**
- `grammarExplanationEnglish`/`French` say "Is this the + noun" asks for *identification*, but form:2 says *Demander confirmation*.
- **Fix:** In both explanations, say it "asks for confirmation" / « demande une confirmation ».

## Verified as coherent (no change needed)

- **Core 19:** The B→"No."→"Where is…"→A→"This is the wall."→repeat sequence works. The word-bank fragments compose every learner turn.
- **Core 20:** The A(nail)→"Yes"→switch to B→ridge sequence works. "Cut" stays out of the exchange, and the archived product-method opening is excluded.
- **English/French turn parity:** It matches in all three lessons across `turnSequence`, `expectedLearnerTurns` and `expectedAll…`, and the closure is merged into the final learner turn.
- **Original objectives:** All three are explicitly incomplete via `holdReason`, `sourceSpeakingCompletionStatus` and `sourceObjectiveCompletionStatus`. No turn uses the sidewall sequence, the "one course at a time" timing, product, sealant, tie-off, anchor, fit/inspection or thumbs-up.
- **Readiness and authorization:** No partner "Yes." confirms equipment readiness, and nothing authorizes safety-critical work.
- **`speakingPriorDraft20261119` `heldDecisionRefs`:** They are the same sets as the current ones, just in a different order.

## Out of scope (leave unchanged; flag only for the qualified reviewer)

- In Core 19, reader:1 and in Core 21, card 12 and reader 3, 5 and 7, the packet has `safetyOrMeaningHold: false` but the candidate rows hold them.
- Several Core 21 hold strings start with a leading space.

Both belong to the existing rows, so this supplement should not touch them.
