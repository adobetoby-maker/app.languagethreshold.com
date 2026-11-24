# Review: master-roofing 10–12 fr-en inert supplements

This review covers only the pasted JSON. I did not check the source packets, the hashes or the Spanish originals. Everything below is a proposed correction, not an edit or an approval.

## Cross-cutting

**1. Hold reasons are misassigned on many held rows.** The reason text often belongs to a different row, so a reviewer could be routed to the wrong question.

| Lesson | Row | Content | Hold text given | Fits |
|---|---|---|---|---|
| 11 | card:9, reader:10 | dizziness | schedule/electrolytes | clinical |
| 11 | card:18 | no work without a break | clinical | schedule/breaks |
| 11 | card:19, reader:11, reader:12 | dizzy / symptoms / heatstroke + 911 | temperature scale | clinical; 911 locale for reader:12 |
| 11 | reader:1 | "more than 100 degrees" | clinical | temperature scale |
| 11 | reader:2 | deadline | clinical | Friday promise |
| 11 | card:20, reader:13 | "without risks" | temperature scale | Friday promise / no-risk condition |
| 11 | card:21, reader:14, reader:15 | encouragement, tacos | 911 | motivational wording |
| 12 | card:8, card:21, card:22, reader:13 | don/doña, usted/tú, Don Ernesto | homeowner/boss, "respect offends nobody", inspector | usted/tú/don/doña mapping |
| 12 | card:18 | homeowner "show you the area" | inspector | homeowner quote |
| 12 | reader:4 | crew quote | homeowner/boss | crew register |
| 12 | reader:8 | manager register | rotten deck | boss register |
| 12 | reader:12 | quisiera/me gustaría softeners | inspector | Spanish softener mapping |
| 10 | card:4, card:15, reader:10 | version, reported speech | an authoring instruction | an actual sense/source reason |
| 10, 11, 12 | excluded readers (10: 9, 11, 16; 11: 3, 7, 9; 12: 6, 7, 14, 15) | various | generic "product, substrate, role or coverage" | 10:reader:16 (agreement) has no such sense at all |

**2. "Full group with its article" prompts teach unidiomatic English.** The prompts tell learners the article is part of the answer. That reinforces "the blame", "the hydration", "the courtesy" and "the slang" as standard English. Internal notes keep literal articles on source faces, but the learner prompt shouldn't require them. Proposal: for mass nouns, drop "avec son article" from the prompt, or pick countable terms instead (e.g. the witness, the cooler, the request).

**3. "Le responsable" is ambiguous.** It means the crew lead in all three `contextFrench` fields, but it is also the gloss for "the manager" (12:card:9). It is close to "la personne responsable" (10:card:14) as well. Proposal: use *chef d'équipe* for crew lead and *directeur/gérant* for manager, subject to qualified review.

## Lesson 10

- **Held term leaks into learner/candidate French.** "Version" is held (card:4), yet it appears in:
  - `candidateObjectiveFrench`: "chaque version distincte"
  - card:18 and reader:5: "raconte-moi ta version"

  Proposal: use *compte rendu* in the objective. Hold card:18 and reader:5 with card:4, or re-gloss them, e.g. *ce qui s'est passé selon toi*, pending review.
- **Scope and objective overstate the content.** The scope says "two accounts" and the grammar text says "keep each person's account in its own sentence." The speaking only reports one person, because Marcos's account (card:15, reader:6) is held. The English objective also says "two details", but there are three content turns. Proposal: change to "one reported explanation and two background details" and remove the "two accounts / distinct versions" wording.
- **The cue points into held reader text.** "What did he explain to you in the printed account?" refers to the story, but the story's "explained to me… dark" is reader:10 and the "dark" fact is reader:7, both held. Only card:16 is candidate. Proposal: "What does the printed card say he explained?"
- **Roles are inconsistent.** `partnerRole` is "crew member giving an account", but the partner only asks quiz questions. The opening "One at a time, please." is addressed to two people in the source (reader:4), while here there is one partner. Proposal: make the partner a "practice partner" and keep the opening only if it is framed as reading card:17.
- **Sense flag:** "la plainte" for card:12 carries a formal/legal reading (*porter plainte*). The crew-grievance sense of *queja* may fit *la réclamation* or *les reproches* better. This needs a qualified decision.

## Lesson 11

- **Source attribution is wrong.** The cue "The character says it has been a tough week. What would you say to him?" doesn't match the story. In reader:4, Rogelio (the lead) says this to the crew, and no printed character complains. Matching goal text: "the printed character's difficult week." Proposal: cue "In the printed story, what does Rogelio tell the crew first?" and goal "repeat the crew lead's acknowledgement."
- **The cue points into a held reader row.** "Printed future sentence about the cooler" in the story is reader:7, which is held and excluded. Card:17 is the candidate face. The learner also utters a water-supply commitment, which the scope disclaims. Proposal: "Read the future sentence on card 17."
- **The opening has no provenance.** "Let's read the printed story together." is a new composition, but it is unlabelled; only the closure has provenance. Separately, the curly apostrophe in "Let’s" doesn't match the straight one in "it's", which will matter for future scoring.
- **The form gloss is inconsistent.** Form:2 French says "+ adjectif", but the English is "+ a tough week", and the grammar text calls it a noun phrase. Proposal: "je sais que ça a été + groupe nominal (une semaine difficile)."
- **`heldCandidateRowsRemaining` is incomplete.** It lists only card:2 and card:3, but many rows are held. Rename the field (e.g. `clinicalProposalRowsHeld`) or complete the list.
- **Objectives don't match.** The French objective says "d'une équipe" while the English says "character", and the French omits "there are still … to go."

## Lesson 12

- **The source speaker and audience are changed.** This is the issue the card:8 hold warns about. In the source:
  - "I'm letting you know that we found a problem" is said to the company manager (reader:8–9).
  - The homeowner line is "Sorry to bother you, ma'am; I'd like to mention something we found" (reader:6, excluded).

  The speaking merges the homeowner opener with the manager line. Proposal: keep both lines but split them into two labelled audience cards, or make the exercise reading-only with no homeowner role.
- **Learner text touches the held register decision and includes Spanish.**
  - `grammarExplanationEnglish` mentions usted/tú. The source is Spanish provenance only, and card:1/card:2 are held.
  - `grammarExplanationFrench` states a vous/tu choice rule, which the scope says it does not set.

  Proposal: remove both and keep "English signals politeness through word choice and tone."
- **The two grammar explanations diverge.** The French one omits "wants to know how to + verb". That form (form:3) isn't used in any activity or in the speaking either; drop it or use it.
- **The partner role is incoherent.** A "homeowner" asks "Which English term means la demande?" (with mixed-language text in an English cue) and then asks for a verbatim repeat. Proposal: relabel the partner as a practice partner reading the card, and replace turn 3 with a turn that uses card:13 or card:5 in a sentence.
