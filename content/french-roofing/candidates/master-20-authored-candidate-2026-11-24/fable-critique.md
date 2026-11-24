# Review of master-roofing 19 and 20 (fr-en), pasted JSON only

**Both lessons stay held.** No files, hashes or packets were checked, and nothing below is an approval. All corrections are read-only proposals.

## Lesson 19

1. **`recall` is ambiguous and under-anchored.** « la carte » can also mean map or menu, so "the card" is not determined by the prompt. Standalone "card" is also the held face of card:20 ("Here's my card."), yet only card:14 is cited and the provenance calls it a new extraction.
   - Proposal: change the prompt to « la carte (de visite), forme courte », add "avec l'article", and add card:20 as a coincident, unselected anchor.

2. **`hear` maps "clear" to « lisible ».** "The business card is clear." is vague in English, and the English grammar note itself uses "legible".
   - Proposal: use "easy to read" or "legible" wherever French has « lisible », including the speaking turns. Otherwise keep "clear" and change the French to « net ».

3. **`write` prompt both leaks and under-determines the answer.** It hands over "the business card" and "to read" in English but never says who offers to whom, so "Would you like him to read…" also satisfies it.
   - Proposal: « Proposez poliment, en anglais, de lire vous-même la carte de visite à voix haute à votre interlocuteur (would like + complément + to). »

4. **The objective says "two readability conditions", but there is only one.** "The printed word is clear" is stated twice, with two connectors.
   - Proposal: "state one readability condition two ways (unless / as long as)", in both `goalEnglish` and `goalFrench`. Otherwise vary the second condition.

5. **Turn counts disagree.** `turnSequenceEnglish` has four learner turns (the opening is assigned to the learner), while there are three expected turns and three cues.
   - Proposal: mark the opening as scene-setting, or add it to the expected turns in both languages.

6. **Three lexical proposals are not ordinary vocabulary.** Proposals 1–3 (final invoice, product warranty, installation warranty) carry candidate French for exactly the domain and locale terms the internal note calls unresolved, and no activity uses them. « la garantie de pose » in particular is a trade and locale decision.
   - Proposal: label 1–3 "domain-held terminology option" and keep only proposal 4 (business card) as an ordinary vocabulary proposal. The identical `internalHold` text currently hides the difference.

7. **Minor French.** « un autre exemplaire » is more natural than « une autre copie » for a printed page.

## Lesson 20

1. **Provenance cites card:10 where no card:10 term appears.** The `write` target says "word list", not "checklist", yet it cites card:10 and claims "term from card10". The speaking anchors repeat this.
   - Proposal: drop card:10 from both and relabel them as new composition with structure from card:16 only.

2. **Speaking practises none of the lesson vocabulary.** Priority, checklist and follow-up never appear in the speaking task; this is a design gap for the next pass. I would not fix it by putting "checklist" into the speaking, because that moves toward held reader:10.

3. **The learner's role is not neutral.** "I want each of you to…" is a leader's register carried over from the crew lead, but the context has three peer learners and a single partner, so "each of you" has no addressees.
   - Proposal: state in the context that the learner leads a reading round for a small group and the partner speaks for that group.

4. **The context contradicts two cues.**
   - "They can choose which word to read first" makes the choice real, while cue 3 frames it as hypothetical ("If you could choose") and cue 1 fixes the order ("the next word"). Proposal: say the order is fixed and the partner asks what the learner would choose.
   - The context says "One learner nearly copied" (French « Une personne »), but the learner answers "I nearly copied". Proposal: "You nearly copied the wrong word."

5. **Cue 3 and its answer do not match.** The cue asks "which word would you read first?" and the answer is "I would choose the shortest word first."
   - Proposal: "I would read the shortest word first." / « Je lirais d'abord le mot le plus court. »

6. **`forms[1]` example echoes a held row.** "…so I checked the list again" mirrors the near-miss-then-checklist sequence of held reader:10, and it differs from the `say` and speaking sentence.
   - Proposal: cut it back to "I nearly copied the wrong word."

7. **Objective and grammar wording.**
   - "A nearly-past sentence" is not standard English, and "hypothetical word choice" reads as diction. Proposal: "a past sentence with nearly" and "a hypothetical choice with would", which matches `goalFrench`.
   - "Would + base verb expresses an imagined choice" is too narrow, and « conditionnel de choix » is not a grammatical term. Proposal: "an imagined or hypothetical situation; here, a choice".

8. **`forms[].meaningFrench` describes the example, not the form.** This applies to « demande de lecture adressée à chacun » and « erreur évitée de justesse ».
   - Proposal: give the general meaning, such as « vouloir que quelqu'un fasse quelque chose » and « avoir failli + infinitif ». Lesson 19 `forms[0]` and `forms[2]` have the same problem.

## Both lessons

1. **Provenance labels are inconsistent for identical targets.** Lesson 19 `see` and lesson 20 `see`, `recall` and `hear` say "Exact source English cardN", which reads as selecting the source face. Lesson 19 `type` uses the correct wording for the same target ("ordinary lexical proposal coinciding with held cardN, not selected source-face answer").
   - Proposal: use the lesson 19 `type` wording everywhere.

2. **Metalanguage and prompt style vary.** « objet » in the write prompts against « complément » in the grammar note; « Écrivez » against « Rendez »; and the two `hear` prompts differ on "avec l'article" and « Ne consultez pas le texte ».
   - Proposal: standardise on « complément » and one prompt template per mode.

3. **Word banks are the full expected turns verbatim,** including the merged "Thank you.", so the speaking task is read-aloud rather than production. Flagged for a design decision.

4. **Lesson 20 carries irrelevant boilerplate.** Its `internalHold` and `internalNotes[5]` refer to warranty content the lesson does not have. Its `sourceObjectiveEnglish` says "in Spanish", a source-direction artefact that must stay internal.

## What holds up in the paste

- **Held state:** every `candidateRows` and `dictionaryMappings` entry has null French, and `selectedFrench` and `audioScript` are null throughout.
- **Gates:** all are false.
- **Held references:** `heldDecisionRefs` match the row counts (21 cards and 16 reader rows; 22 cards and 18 reader rows).
- **Leakage:** no learner-facing string contains warranty, coverage, insurance, harness, fall, weather, repair or schedule content.
- **Excluded decisions:** no ladder setup method or triage decision is assumed.
- **Register:** French is consistently *vous*, and « à condition que … soit » and « J'ai failli recopier » are correct.
