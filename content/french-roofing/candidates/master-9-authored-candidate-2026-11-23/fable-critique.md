# Shared batch read-only critique

**Review of the pasted JSON only (Master 7, 8, 9).** I checked nothing against the packets, so every "exact source" and `conditionalFrench` claim is assessed solely against the pasted `candidateRows`. These are correction proposals, not approval.

## Master 7
1. **Storm sense contradiction.** `reader:1` candidateFrench uses « L'orage est passé… », while `card:7`, `card:15` and the speaking use « la tempête ». This collides with Master 8 `card:3` (« l'orage » = thunderstorm), which the `card:7` note says it avoids. Proposal: align `reader:1` to the generic candidate or hold it.
2. **Provenance conflict.** The hear and write activities say "French from card:7/15 conditionalFrench", but those rows label the French a "new generic candidate" and a "new unselected translation". Proposal: relabel both activities as new composition.
3. **Speaking turn 3 misaligned.** "Which term would you like to hear again?" is open (the hail is equally valid) but expects only "The chalk circle". The learner then thanks the partner before anything is repeated. The goal says "repeat… a printed term", but the learner only names one. Proposal: add a partner repeat and a learner echo, or fix the cue to one term.
4. **French for card:20 and card:13.** « Pouvez-vous répéter plus lentement ? » drops "that" (« répéter cela »). « le cercle à la craie » is elliptical; offer « le cercle tracé à la craie » as an option.

## Master 8
1. **Write task not recoverable.** « Malheureusement, nous ne pouvons pas faire cela » yields "Unfortunately, we can't do that", not the cleft target. Proposal: prompt « …c'est quelque chose que nous ne pouvons pas faire ».
2. **Speaking cue 1 has no antecedent.** "Could you read the entire document instead?" follows "Can we begin?". Proposal: open with an offer to read the excerpt; "the excerpt" is in the word bank but unused.
3. **Use/mention confusion.** "An alternative is to read…" (real noun) is followed by "The alternative is on line A" (printed label, unquoted). The French support leaves the English terms bare. Proposal: quote the terms as Master 9 does.
4. **Form 3 unused and unflagged.** "What alternative can we offer?" appears in no activity or turn; the partner line "What can you offer instead?" sits in the learner word bank. It and reply 2 parallel the held `card:19` / offer-an-alternative objective, but the form has no `heldDependent` flag.
5. **"Exact card18" typography.** The speaking and form use curly apostrophes; the row and activity use straight ones. Proposal: normalise or drop "exact".
6. **Sense options.** « le raccourci » in isolation reads as a literal route; the figurative sense exists only in held `reader:10`. « la solution de rechange » does not uniquely cue "the alternative"; list « l'alternative » as an option.

## Master 9
1. **Structural held leakage.** The speaking replays the held source objective beat for beat:
   - a private opening;
   - "I want you to…";
   - "What happened…";
   - a self-explanation, parallel to held `reader:7`;
   - "Let's … again", parallel to held `reader:9` / `card:18`.

   Form 3 admits the `reader:7` parallel but has no `heldDependent` or refs, and "Let's" is untaught and unattributed. Proposal: flag form 3 and the closing turn.
2. **`reader:14` leaks held choices.** It commits to « bardeaux » (shingle/product sense is held) and renders "supervisor" as « le responsable de l'entreprise », a role shift. Proposal: hold the row or list options.
3. **Register.** `card:17` appears as « ton avis » in the rows and dictionary but « votre avis » in the activity, form and speaking. It is labelled, but only one should surface per lesson. « gronder » is adult-to-child register for a coworker.
4. **Speaking coherence.** "What do you want me to read?" presupposes a reading no one mentioned. "You think there is a mistake" is an unused word-bank item. Form 3 glosses « penser que » while the support uses « penser l'avoir ».
5. **Write alternates.** « à votre avis » equally yields "in your opinion".

## Cross-cutting
- **Internal notes in learner text.** Move these to internal notes:
  - "without selecting an inspection or claim result" and "source-story" (7);
  - "rather than selecting a proven cause" / « sans établir une cause avérée » (9).
- **Article transfer.** Requiring "the hail", "the thunder", "the responsibility" and "the quality" for generic « la … » reinforces French article overuse. Flag for qualified-English review rather than changing source faces.
- **Direction.** Hold texts say "Author French narration/practice/grammar objective", and `sourceSpeakingEnglish` embeds Spanish target forms. Both contradict the English target and must stay internal.
- **Clean.** `heldDecisionRefs` are complete against the pasted held rows in all three lessons. There is no ladder-setup or triage content, and no held counts, claim or scope text in learner turns.
