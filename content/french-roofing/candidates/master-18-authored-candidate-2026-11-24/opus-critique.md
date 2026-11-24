# Review: master-roofing 16–18 (fr-en), proposal-only

I reviewed only the pasted JSON. I did not open any files or check the packet hashes. Everything below is a correction proposal, not an approval.

## Issues in all three lessons

**1. Activity answers are held source faces.** Several `candidateTargetEnglish` values are the exact held card text. Their `expectedMeaningFrench` repeats the lexical proposal, which in effect selects French for a held row while `candidateRows[].candidateFrench` stays null.

| Lesson | Activities | Held anchor | Risk |
|---|---|---|---|
| 16 | see / recall / type | card2 "the building permit", card3 "the inspection card", card13 "the requirement" | Domain and locale choices: *permis de construire* (France) vs *permis de construction* (Québec); a US posted inspection card vs *fiche*; *exigence* vs *prescription*. These are not ordinary vocabulary. |
| 17 | see / recall / type | card1 "the daily report", card2, card3 | *rapport quotidien / journalier / journal de chantier* is a domain choice. "Summary" and "address" are ordinary. |
| 18 | see / recall / type | card1, card2, card4 | *message texte* is Québec usage; France uses *SMS/texto*. That is a locale choice. |
| 18 | **hear** | card18 "I look forward to your reply.", labelled "exact card18 sourceEnglish" | Exact held sentence used as the target, plus a French register choice (*Dans l'attente de votre réponse*). This is the clearest leak. |

Proposal:
- **Domain terms:** replace them with new, non-source targets, such as "the word list", "the heading", "the copy" or "the page".
- **Ordinary terms you keep:** relabel provenance as "ordinary vocabulary proposal; coincides with held cardN; does not select cardN".
- **18 hear:** replace it with a new composition, e.g. "I look forward to reading your message."

**2. Internal notes appear in learner-facing text.** Move these to `internalNotes`:
- In every `grammarExplanation*`: "Partial language practice only; it does not replace or complete the original work mission."
- 16: "with no authority verdict" and "sans verdict d'autorité".
- 17: "Examples are hypothetical … not field report content" and "This is a document-reading exercise."
- 18: "No appointment, schedule or contract is stated" and "No digits or appointment are provided."
- In every `learnerRole`: "…not work-mission execution". The role itself, "crew lead", does not fit a word-list exercise. "learner" would be better.

**3. French errors repeated in every lesson.**
- "elle ne remplace pas ni ne complète" is ungrammatical. Use **"elle ne remplace ni ne complète"**.
- "verbe à la base" is a calque. Use **"base verbale (infinitif sans *to*)"**.
- Spacing is inconsistent: there is a space before "?" but none before ";". Pick one convention, e.g. "court ; de plus".

**4. English spelling variant.** "practise" in 17 and 18 is UK spelling, but the source is US English ("dialed"). Align the target variant: "practice".

## Lesson 16

- **Speaking flow doesn't hold together.** The opening, "Let's review the copied English word" (singular), conflicts with the later question "Could you tell me *which word* needs to be corrected?" Change the opening to "Let's review the copied English text."
- **Passive cue doesn't match its support.** The English cue "How is the inspection card written…?" could invite "by hand" or "neatly", while the French support asks "Dans quelle langue…". Change the cue to "What language is ___ written in?"
- **Passive example uses a held noun.** Form 3 and the final turn are built on card3 "the inspection card", so its held sense carries into the sentence. Change them to "The word list is printed in English." Update the context and objective to match.
- **Duplicate activities.** "hear" and "say" have identical targets. Make "hear" a distinct sentence, e.g. the passive one.
- **Misleading French gloss.** Form 2 `meaningFrench` attaches "sans « to »" to the French side. Change it to: "would rather + base verbale (sans *to*) ≈ préférer + infinitif".

## Lesson 17

- **The dialogue contradicts itself.** The learner first describes the summary as short and in English, then says "I cannot read the summary." Change the line to "I cannot read this copy of the summary; therefore, I will ask for a clearer copy." Mirror it in French: "cette copie du résumé".
- **Opening uses a held face.** "Let's read the daily-report practice page" contains card1. Change it to "Let's read the practice page."
- **Cue 1:** "Add *another* description" is the first description. Change it to "Describe the page. Use *in addition*."
- **Cue 2:** "the two language features" is vague. Change it to "Say that the heading and the summary are both in English. Use *likewise*."
- **Cue 3:** "What will you do because you cannot read…" presupposes something not yet said and sounds unnatural. Change it to "One copy is hard to read. What will you do? Use *therefore*."
- **Provenance:** "card1 sourceSpanish/sourceEnglish" should read "sourceEnglish". Spanish is provenance only.

## Lesson 18

- **Write activity French is ambiguous.** "Je me réjouis d'avoir de vos nouvelles" reads in France as already having received news; the forward-looking sense is Swiss or Belgian. Change it to **"Au plaisir d'avoir de vos nouvelles."**
- **Objective doesn't match the grammar.** The objective says "state a reading *preference*", but *would like to* is described as a wish. Change the objective to "state a reading choice".
- **Speaking flow doesn't fit.** The opening, "Let's practise reading the message aloud", is followed by "You did not hear the phone number." Change the opening to "Let's practice a phone role-play."
- **Form 3 is inconsistent.** It is labelled "+ gerund", but `meaningFrench` says "nom ou forme en -ing". Pick one and match the grammar explanation. Also remove the irrelevant card2 anchor from Form 3.
- **Cue 3 points back to the held sentence.** "close a message when you expect a reply" steers the learner toward card18's wording. Reword it so it elicits "hearing from you".
- **Lexical proposal 4 is a full-sentence register choice, not vocabulary.** Withdraw it or mark it explicitly as held-dependent and unselected.

## No issues found

- I found no ladder, setup, triage, inspection-verdict or schedule decisions in the new compositions.
- All gates and `reviewed` flags are false.
- `sourceObjectiveCompletionStatus` is correctly marked incomplete in all three lessons.
