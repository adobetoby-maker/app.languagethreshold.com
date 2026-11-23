# Shared batch read-only critique

# Review of pasted MASTER1–3 supplements (read-only proposals)

This review covers only the pasted JSON. I did not open any packets or check any hashes. None of this is an approval, qualified or otherwise.

## Cross-cutting

1. **Domain notes appear in learner text.**
   - `grammarExplanationEnglish` ends with internal disclaimers:
     - M1: "these sentences do not specify a roof installation sequence"
     - M2: "These examples concern printed words."
     - M3: "Here the referents are words and reference-sheet pictures."
   - M2 `practiceContextEnglish` contains "not as a roof-performance claim".
   - The M1 French explanation drops its disclaimer, so the English and French no longer match.
   - **Proposal:** move these to `internalNotes` and keep the learner-facing EN and FR texts parallel.
2. **Complications never happen in the dialogue.** No `turnSequenceEnglish` contains the stated `complicationEnglish` (M1 unfamiliar term, M2 partner confusion, M3 "what does *it* refer to"). Either add the turns or mark the complications as optional or unscripted.

## MASTER1

3. **Wrong word in the French grammar explanation.** `grammarExplanationFrench` says "First puis then ordonnent…". The connector should be **et**: "First et then ordonnent…". As written, "puis" reads as if it were the gloss of *then*.
4. **The opening request gets the wrong answer.**
   - The learner asks "Could you explain the term 'the layer'?" and the partner replies with a location ("It is on line A").
   - No meaning is ever given, so the candidate objective ("Clarify roof-system vocabulary") is never practised.
   - **Proposal:** either have the partner give the French sense ("It means *la couche*."), or change the opening to "Could you show me the term…?"
   - The word-bank items `the roof system` and `the ridge` are never used.
5. **Held register decision leaks into unheld rows.**
   - The card 19 hold says to check informal new-hire versus formal client address.
   - But cards 20 and 21 are unheld and already select *tu* ("Pose-moi…") and *vous* ("adressez-vous à moi").
   - Their containing Reader lines 16 and 17 are held.
   - **Proposal:** propagate the hold to cards 20 and 21, or record that register was decided separately.
6. **Card 10 `le faîtage` overlaps the held ridge cap (card 11).**
   - In French usage, *faîtage* can mean the ridge covering element as well as the ridge line; *faîte* is the less ambiguous term for the line.
   - Because it is used as the expected answer in `recall`, this pre-empts the held flashing/ridge-cap terminology decision.
   - **Proposal:** hold the row or flag it explicitly. Locale has the same problem on card 6: *bardeau d'asphalte* (Québec) versus *bardeau bitumé* (France), with no locale decision recorded.
7. **Reader 7 is unheld but its answer is held.** It asks why they don't start at the top, and the answer (Reader 8–9) is held. This is a linked sentence under the propagation note. Hold it or annotate it.

## MASTER2

8. **An internal English note sits inside the French prompt and answer.** In the `say` activity, `promptFrench` and `expectedMeaningFrench` both contain "la fuite (word meaning only; no diagnosis)".
   - **Proposal:** prompt « la fuite » and move the note to `provenance`.
   - Card 7 also needs sense review: Spanish *gotera* means a roof leak or drip, so *fuite* versus *infiltration* is unresolved.
9. **Turn 3 doesn't answer the question.**
   - The partner asks "How can someone ask about a phrase?" and the learner replies "If you want the meaning of 'over time', ask about that phrase". That is circular and gives no method. Form 2's example has the same problem.
   - **Proposal:** "If a phrase is unclear, ask 'What does "over time" mean?'"
   - Form 2's `meaningFrench` "Si + présent, puis impératif" also misuses *puis*. It should be "Si + présent, + impératif".
10. **The French support doesn't translate the English turn.**
    - Turn 1 in English glosses with "as time passes", but the French gives « avec le temps », which is circular.
    - **Proposal:** « au fil du temps ».
    - "as time passes" is a new composition in the word bank with no provenance label.
11. **Spelling variant.** "practising" is British spelling, while the source is US-context ("Ma'am", "drip edge"). Pick one variant for the English target.

## MASTER3

12. **Held-row leakage: `the hose`.**
    - The held tool-safety reason names "hose" explicitly ("Nail-gun trigger, hose, compressor pressure…"), yet card 10 is unheld and used in `type` and speaking.
    - *Tuyau d'air* also narrows the sense of *hose*.
    - **Proposal:** hold it, or record why the bare term is separable from the held instruction. `the compressor` (card 8) is adjacent to "compressor pressure" and should get the same check.
13. **Reader 15 pre-empts the held register decision.**
    - "M. Ernesto" chooses an honorific while card 20 and Reader 16 are held for exactly this register question.
    - *M.* + first name is also awkward as a rendering of *Don Ernesto*.
    - "ailleurs" drops "at another company".
    - Typography: "arrive; il" should be "arrive ; il".
14. **Turn 3 doesn't answer the question.** The partner asks "Which label should we leave for last?" and the learner answers "Don't skip that label."
    - **Proposal:** cue "Which label should we not skip?", or answer "The nail gun. Let's read it last."
15. **The `say` activity changes register without saying so.**
    - It is labelled as a card 18 base, but card 18 French is *tu* ("Regarde bien") and the activity uses *vous* ("Regardez attentivement").
    - **Proposal:** label the register shift as a new composition.
    - Also, form 2's template omits "on the sheet" but its example includes it. Align them.
