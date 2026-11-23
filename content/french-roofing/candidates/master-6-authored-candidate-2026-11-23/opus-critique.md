# Shared batch read-only critique

# Review: master-roofing 4–6 (fr-en), pasted JSON only

I reviewed only the pasted text. I could not check source packets, hashes or archived evidence. These are correction proposals, not approval.

## Cross-lesson

1. **Boilerplate doesn't fit these lessons.**
   - `scenarioProvenance` ("word-card/picture… approved gear… protection-system check") doesn't describe a document-reading dialogue (4), a term-dictation exercise (5) or a supplier call (6).
   - `internalNotes` repeats the last line twice and mentions fall-protection, which has nothing to do with these modules.
   - **Proposal:** write a per-lesson scenario note and remove the duplicate.
2. **Listed sources aren't used.** `lessonProvenance` lists rows that no activity, form or speaking turn anchors:
   - Lesson 4: card:15, card:18, reader:4
   - Lesson 6: card:9, card:14
   - **Proposal:** either anchor them or list them as "unheld, unused."
3. **Apostrophes are inconsistent.** Lesson 6 `activity:say` uses a straight "We're", while `form:2` and the speaking turns use a curly "We’re". Lesson 4 uses curly throughout.
   - **Proposal:** normalise before any exact-match scoring is enabled.

## Lesson 4

1. **Register leak on card:18 (material).**
   - The Spanish "No lo hagas de memoria" uses tú. The candidate "Ne le faites pas de mémoire" uses vous.
   - card:20, reader:10 and reader:11 are held specifically to resolve tu/vous in this scene, but card:18 is unheld and already commits to vous.
   - **Proposal:** hold card:18 under the same register decision, or record that it's register-pending.
2. **Meaning drift on reader:16 (material).**
   - The source says "…and that's how we do it." The candidate says "nous suivons sa fiche" ("we follow its sheet").
   - That's a new claim, and it's exactly the follow-the-sheet relationship that card:16 and reader:2/3 hold.
   - **Proposal:** use a faithful rendering ("…et c’est comme ça que nous le faisons"), or hold the row. Also add a French space before the semicolon: "fabricant ;".
3. **"Give me a moment" has two French renderings.**
   - card:21, the dictionary and `activity:hear` use "me laisser un instant". This can read as "leave me alone for a moment."
   - `form:3` and `candidateOpeningFrench` use "m’accorder un instant".
   - The source "¿Me permite un momento?" supports "m’accorder."
   - **Proposal:** use one rendering, preferably "m’accorder," across every field.
4. **Gloss leaks into card:12's French.**
   - The answer "l’étape d’une procédure" carries the English disambiguator "(in a procedure)" into the learner-facing French.
   - **Proposal:** make the French "l’étape" and keep the sense note internal.
5. **Unsupported gender on reader:15.**
   - "La propriétaire" sets the homeowner as female. The pasted English is gender-neutral.
   - **Proposal:** verify against the Spanish, or use a neutral wording.
6. **Hold consistency on card:15 and card:18 (question for the reviewer).**
   - card:15 ("you have to read the sheet") and card:18 ("don't do it from memory") express the same relationship as the held reader:2 and reader:11.
   - **Proposal:** confirm the split is intentional and record why.

## Lesson 5

1. **Partner role contradiction.**
   - `closureProvenance` says the partner is "a crew member."
   - `partnerRole` says "a language-practice partner."
   - **Proposal:** align `closureProvenance` with `partnerRole`.
2. **The dialogue doesn't hold together.**
   - The opener "Could you repeat…?" asks for a repetition before anything has been said.
   - The final learner turn, "The extra day. Thank you.", names a term that never gets the read-aloud the goal promises.
   - **Proposal:** have the partner say "the contract" first, then add a partner turn reading "the extra day" before the learner's thanks.
3. **Awkward English.**
   - 'the term "the authorization"' repeats the article inside the quoted term.
   - **Proposal:** use 'Could you repeat "the authorization", please?' (and the same pattern for "the contract") in the activity, form and speaking turn.
4. **Hold reasons are imprecise.**
   - reader:6 ("talk with the homeowner") and reader:9 ("Shall I show you the photos?") use the generic "product, substrate… coverage" reason.
   - Their actual dependencies are homeowner register/noun (card:14) and the photo (card:19).
   - **Proposal:** cite those dependencies.

## Lesson 6

1. **The speaking presupposes held facts (material).**
   - "When will the rest arrive?" presupposes a partial delivery. That fact exists only in the held card:15 and reader:2.
   - "We’re going to call again about the delay" presupposes a delay. That fact is only in the held reader:5. In the dialogue, the partner says only that there's no confirmed time.
   - **Proposal:** in the speaking, use "When will the order arrive?" (the `form:1` example) and "…call again about the order." Keep "the rest" only in the isolated exact-source `hear` activity.
2. **Speaking doesn't match the grammar.**
   - The opener uses "Could you…", which this lesson's grammar doesn't explain.
   - The "Is… in stock?" form is never practised in the speaking.
   - **Proposal:** either add a stock-question turn (with no answer chosen) or add a Could-you note to the grammar.
3. **Confusing formula in `form:3`.**
   - "Le groupe nominal est-il en stock ?" reads as a literal sentence.
   - **Proposal:** use the placeholder notation the other forms use: "[groupe nominal] + est-il en stock ?"

## Not flagged

- The held rows in all three lessons don't appear as activity, form or speaking anchors.
- Exact-source and new-composition labels match their content, apart from the reader:16 drift above.
- All gates and `scoringEnabled` flags are false, consistent with an inert supplement.
- The terminology proposals are marked unselected and internal. I made no selection among them.
