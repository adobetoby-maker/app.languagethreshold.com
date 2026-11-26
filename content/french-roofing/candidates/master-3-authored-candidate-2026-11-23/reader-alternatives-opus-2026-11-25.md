# Critique: French Roofing Master 1–3 Reader alternatives

This review covers only the supplied text. I did not open or check any repo files or hashes.

## Master 1

### Reader 14: "Am I making sense?" / "¿Me explico?"

- **Alt 1** ("Est-ce que mes explications sont claires ?") keeps the focus on the explanation rather than Kevin's competence, so it matches the teaching focus. It does change the grammatical subject from *I* to *my explanations*. That is acceptable, but the note should say so.
- **Alt 2** ("Est-ce que je suis clair ?") needs a specific register note. Spoken French "Je suis clair ?" often sounds stern, like "Do I make myself clear?" The English line is a hedged self-check. Replace "tone/pragmatic nuance pending" with: *may read as admonishing; English source is a hedged self-check.*
- **Optional third alternative:** "Rogelio : Tu vois ce que je veux dire ?" This is the closest informal equivalent and fits the Kevin scene. Label it as introducing *tu*, which the English line doesn't mark.
- **Avoid** "Tu comprends ?" and "Tu me suis ?". They shift the check onto Kevin's comprehension, which the teaching focus excludes.

### Reader 16: "Exactly, and if you have questions, ask me anything you want."

- **Alt 1:** "pose-moi toutes les questions que tu veux" has two problems:
  - It repeats *questions*.
  - It turns "anything you want" / "lo que quieras" into "all the questions you want," which changes the quantifier.
  - **Correction:** "Rogelio : Exactement, et si tu as des questions, demande-moi tout ce que tu veux."
- **Alt 2 (vous contrast): remove it.** The source's register contrast is R16 *tú* versus R17 *usted*. A *vous* version of R16 merges the two lines and undercuts what R17 teaches. If it stays, label it: *not source register; source R16 is tú.*
- "Exactement" alone is correct. Don't expand it to "C'est exactement ça," which reads more like approval of the held Reader 15.

### Reader 17: "With a client you say it this way: If you have questions, ask me."

- **Outer frame:** the source is impersonal ("se dice") and the English uses generic *you*. The register label "outer tu to Kevin" isn't supported by the source.
  - **Correction:** "Rogelio : Avec un client, on le dit comme ça : « Si vous avez des questions, demandez-moi. »"
  - Change the register field to: *outer impersonal (on), spoken to Kevin; inner vous to client.*
- **"comme ceci"** is written and stiff. "comme ça" is the spoken equivalent.
- **"posez-les-moi"** is grammatical but heavy in speech. "demandez-moi" or "posez-moi vos questions" are both fine.
- **Do not reproduce the "a mí" emphasis.** The Spanish "pregúnteme a mí" means "ask *me*," but the English doesn't carry that emphasis. So avoid "c'est à moi qu'il faut les poser" and the archive's "adressez-vous à moi."
- The alternatives correctly leave out the archive's "plutôt," which isn't in the source. Keep it out.

## Master 2

### Reader 1: "…asks why the joints don't go in a straight line."

- Both alternatives are faithful.
- Add a note against "ne sont pas alignés." It would merge "straight line" with Reader 3's "line up" (s'aligner), the concept the lesson's answer teaches.
- **Copy-paste error:** this row's `contextDependency` mentions the "showing offer" and "two is source count." Both belong to Reader 2. Write a separate note for Reader 1 that covers the question only.
- **Traceability gap:** the hold says it was "propagated from existing source decisions," but `sourceDecisionQuestions` is empty. None of the five decisions list reader:1 or reader:2. Name the source decision (Q1, joint terminology, looks likely) or state that no direct question applies. The same gap exists in Reader 2.

### Reader 2: "Look, I'll show you with two shingles."

- **Alt 1** is correct. Keeping "bardeaux" and excluding "tuiles" is right, because the English says shingles even though the Spanish says "tejas."
- **Alt 2 (vous):** the source has no register contrast here, and Kevin is *tú*. Remove it, or label it *unsourced register contrast*. This is less harmful than in Master 1 Reader 16 but serves no source purpose.
- Don't use "je vais te le montrer." The Spanish *lo* has no counterpart in the English target.

## Master 3

### Reader 14: "And the gun, don't point it at anyone, not even as a joke."

- **Alt 1** keeps everything that matters:
  - the topic dislocation ("Et la cloueuse, …"),
  - *anyone* as "personne,"
  - *not even* as "même."
- "pointer vers" is better than "braquer sur," which sounds like a firearm. If a variant is wanted, "ne la dirige vers personne" is common tool-safety wording.
- **Teaching focus addition:** English "the gun" is shorthand for "nail gun." The French "cloueuse" spells this out, and the note should say that so learners don't read the English as a firearm.
- **Alt 2 (vous):** in this lesson, *vous* belongs to Don Ernesto (Reader 16, open decision Q4). A *vous* prohibition addressed to Kevin is unsourced, and it could be read as plural and crew-wide. Remove it, or label it *unsourced; does not represent the Don Ernesto register decision.*

## Cross-cutting

- **Speaker labels:** every dialogue row has "Rogelio :". No speaker is missing.
- **Added content:** none of the alternatives adds encouragement ("n'hésitez pas"), the approved-plans request, a technical sequence, or an operating method.
- **Typography:** I can't tell from the pasted text which space character precedes ":", "?" and the guillemets. It should be a non-breaking space (U+00A0 or U+202F) so the punctuation doesn't wrap onto its own line.
- **Quote marks:** the archive puts outer guillemets around dialogue, but the alternatives don't. That's fine, but apply it the same way everywhere. Right now the only guillemets are the inner client quote in Master 1 Reader 17, which is correct.
- **Holds:** every row correctly keeps `holdResolved: false` and `selectedFrench: null`. Nothing above resolves a hold or completes an objective.
