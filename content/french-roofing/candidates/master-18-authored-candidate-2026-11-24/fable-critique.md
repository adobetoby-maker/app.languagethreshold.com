**Scope:** I reviewed the pasted JSON only; the packet paths and sha256 values are unverified. Everything below is a proposal for a qualified reviewer, and nothing here is approved or selected.

## Cross-lesson

1. **Held-face coincidence acts as a de facto selection (17, 18).** Five activities use a held face verbatim as the target and its `lexicalProposals` French as the learner prompt:
   - 17 `recall` (card:2, le résumé) and 17 `type` (card:3, l'adresse)
   - 18 `see` (card:1), 18 `recall` (card:2) and 18 `type` (card:4)

   The same applies to the 17 `forms[].meaningFrench` values for cards 12–14 (de plus, de même, par conséquent). Lesson 16 avoids this with non-source nouns. Proposal: either substitute non-coinciding nouns as in 16, or keep these explicitly blocked as coincident rather than as "ordinary vocabulary".

2. **"NEW" provenance is overstated.**
   - 16 `say` and `form:1` are held card:19 with one substitution (what → which word).
   - 18 `write` and `form:3` reuse the held card:18 stem and its closing function.

   Proposal: relabel both as "minimal adaptation of held face", or recompose (for example, 16: "Could you tell me how this word is spelled?").

3. **Anchors do not support what they are cited for.**
   - 16 `type` "the copy" → card:13 (the requirement): there is no thematic link.
   - 16 `hear` and `form:3` (passive) → card:3, a noun; the passive evidence is in cards 17/18.
   - 18 `say` and `form:1` (could) → cards 4/2, both nouns; "could" appears in card:17. Card:2 is not in the sentence at all.

4. **Role carries a held source role.** `learnerRole` is "crew lead…" in all three lessons, taken from held `sourceSpeakingEnglish`, and it has no function in the reference-page scenarios. Proposal: use a neutral "language learner" and move the "not work-mission execution" caveat to internal notes.

5. **Internal notes sit in learner-facing context, and the EN and FR differ.**
   - 17 `practiceContextEnglish`: "This is a document-reading exercise."
   - 18 `practiceContextEnglish`: "No digits or appointment are provided."

   Neither appears in `contextFrench`. Proposal: move both to internal notes.

6. **Locale is mixed.** 16 "le permis de construire" leans France; 18 "le message texte" leans Canada. No locale is decided, so both should be flagged rather than left to coexist silently.

7. **Vocabulary is taught in one lesson and used in another.**
   - 17 uses "heading", "copy" and "clearer" without teaching them (the first two are taught only in 16).
   - Taught but never used in their own lesson: 16 "the heading" and "the copy"; 17 "the address"; 18 "the phone call".

8. **Prompt wording and typography are inconsistent.**
   - "groupe anglais" (16) versus "expression anglaise" (17, 18).
   - "base verbale" versus "verbe à la base" (18 `say`).
   - "copié" versus "recopié" (16).
   - "court;" and "anglais;" (17 `hear`, `write`) versus " ; " (17 `say`).
   - 18 `see` quotes "message texte" without its article and says "dites" in a see mode.

9. **Partner cues differ in kind.** In 16 they are in-role questions; in 17 and 18 they are director instructions ("Use likewise").

## Lesson 16

- **`recall`:** "le titre" most naturally yields "the title", not "the heading". Proposal: "l'intitulé" or "le titre de section".
- **`contextFrench`:** "une correction de copie" reads as marking an exam paper. Proposal: "une correction à apporter au texte recopié".
- **Speaking, turn 2:** the partner asks about "the copied word" (one known word), but the learner asks *which* word. Proposal: "…about the copied text?". The learner's question is also never answered.
- **Grammar note:** the EN says "how text is printed" while the FR says "un texte imprimé", and the example actually states the language of printing.
- **Embedded question:** "which word needs…" is a subject question, so it does not show the embedded word order the lesson is teaching.

## Lesson 17

- **Speaking, cue 1:** "Describe the page. Use in addition." does not give the content "short" or "clear", and neither does the context. Proposal: state both facts in the context or the cue.
- **Speaking, cue 3:** the cue says "hard to read" but the expected turn says "cannot read … of the summary".
- **`say`:** "plus lisible" is rendered "clearer", while `hear` renders "clair" as "clear". Proposal: "plus nette", or the target "a more legible copy".

## Lesson 18

- **Coverage gap:** "would like to" is in the objective, `form:2` and the speaking turns, but no activity practises it. "Look forward to" has two (`hear`, `write`).
- **`form:1` label:** it says "polite possibility", but the example, `meaningFrench` and the grammar note all say polite request. The label looks like residue of the held card:17 sense.
- **`hear`:** "Je lirai votre message avec plaisir" loses the anticipation. Proposal: "J'ai hâte de lire votre message." There are also three different French renderings of "look forward to" across `hear`, `write` and lexical-proposal:4.
- **Speaking, final turn:** "I look forward to hearing from you" is a written closing, used here to end a live phone role-play. Proposal: frame it as reading the closing line of the printed message.
- **`say`:** the prompt does not signal "your", so "the phone number" is an equally valid answer.

## Checked with no finding

- No ladder-setup, triage, field-method or objective-completion content appears in learner text.
- `candidateRows` and `dictionaryMappings` stay null/held, and all gates are false.
- Spanish appears only in internal source fields.
