# Shared batch read-only critique

# Review: master-roofing 7–9 (fr-en)

This review covers only the pasted JSON. I did not check packets, hashes, or files, and nothing here approves the content.

## Lesson 7

**1. The `speakingProvenance` field is wrong.**
- It says "learner turn 1 is exact card:20". Card:20 is actually the *opening*. Learner turn 1 is card:15.
- It says "cues 2 and 3 are new English compositions from card:10 and card:13". Card:10 (gutter) does not appear anywhere in the speaking.
- Cue 2 and learner turn 2 come from card:3 and reader:1. Learner turn 2 is the extracted reader:1 span, and the field doesn't identify it.
- **Proposed:** "Opening = exact card:20. Cue 1 and learner turn 1 = exact card:15. Cue 2 = new composition from card:3 and reader:1. Learner turn 2 = extracted reader:1 span (as in form:2). Cue 3 = new composition. Learner turn 3 = exact card:13 plus a new closing."

**2. Learner-facing text contains internal source wording.**
- Examples: "in the source story", "dans le récit source", "the source line", "source weather narration".
- **Proposed:** use "in the story", "dans l'histoire", "the line", and "the storm narration". Keep "source-fiction" labels in the provenance fields only.

**3. `goalFrench` doesn't match the task.** "reformulez" means *rephrase*, but the expected turns repeat the line word for word. **Proposed:** "répétez".

**4. The French for card:20 is inconsistent.**
- The activity uses "Pouvez-vous répéter plus lentement ?"
- `candidateOpeningFrench` uses "Pouvez-vous répéter cela plus lentement ?"
- **Proposed:** pick one form. If the opening keeps "cela", mark it as new.

**5. form:1 `meaningFrench` blurs two tenses.** "prétérit « est passé »" labels a French passé composé as a prétérit. **Proposed:** "prétérit anglais, rendu ici par le passé composé « est passé »". Apply the same fix to form:2.

**6. Minor items:**
- Cue 2 writes "fifteen" but the expected answer writes "15". Normalise one way before scoring is ever enabled.
- `internalNotes` has a duplicated line.
- That line also mentions "fall-protection", which doesn't fit an insurance lesson.

## Lesson 8

**1. The `speakingProvenance` field is wrong.**
- Cue 1 ("Could you read the entire document instead?") contains nothing from card:6.
- Card:7 (risk) and card:9 (responsibility) are not used in the speaking at all.
- The opening turn's origin is not stated.
- **Proposed:** "Opening, all cues and learner turns 2–3 = new compositions. Learner turn 2 uses card:12. Learner turn 3 uses card:12 and card:14. Learner turn 1 = exact card:18."

**2. The so-is item leaks from a held row.**
- Held reader:15 is "The decision is mine, and so is the responsibility." It is held for refusal-practice authoring.
- form:2 and learner turn 3 reuse both its construction and "the decision".
- **Proposed:** either use nouns unrelated to reader:15, or add reader:15 to the provenance as structural inspiration and keep it held-dependent.

**3. The roles don't line up.**
- The partner is the one making the request, yet asks "What alternative can we offer?"
- The learner's answer, "read the excerpt", just repeats the learner's own opening, so the exchange goes in a circle.
- **Proposed:**
  - Cue 2: "What can you offer instead?"
  - Learner turn 2: "An alternative is to read the word list."
  - Or change the opening so it doesn't already propose the excerpt.

**4. Some French is ungrammatical or awkward.**
- form:1 `meaningFrench` "Ne pouvons pas + infinitif." is a fragment. **Proposed:** "ne pas pouvoir + infinitif (nous ne pouvons pas…)".
- Learner turn 3 French is awkward. **Proposed:** "The alternative se trouve à la ligne A, tout comme the decision. Merci."

**5. Two lessons share one French cue.**
- Lesson 7 has "the storm" → "l'orage" and lesson 8 has "the thunderstorm" → "l'orage".
- Any French-to-English recall would accept two answers.
- Flag this for dictionary disambiguation, for example "la tempête" vs "l'orage", pending qualified review.

**6. Minor:** form:1 provenance reads "card18" with no colon.

## Lesson 9

**1. The register and provenance of card:17 contradict each other.**
- Card:17's candidate French is "à ton avis" (tu).
- activity:write uses "à votre avis" but says "French from card:17 conditionalFrench". That claim is false.
- form:2 says the vous version is "newly proposed", which contradicts the activity.
- **Proposed:** either use "à ton avis" and keep the exact-card provenance, or keep vous and label it as a new register adaptation. The source uses tú with Julio ("según tú").

**2. The want-request item leaks from a held row.**
- Held card:15 and reader:4 are held specifically because the French rendering of "want" (request strength, and the subjunctive after a wish) is unresolved.
- Learner turn 1's French "Je veux que vous lisiez…" and form:1's gloss "Vouloir que quelqu'un fasse…" choose exactly that rendering.
- **Proposed:** keep the English form, and mark the French support as held-dependent on the card:15 decision. Do not present it as settled.

**3. The `speakingProvenance` field is wrong.**
- It says "Learner turn 1 uses exact card:17". Card:17 is learner turn 2.
- The opening, "Can we talk in private?", is a new composition using card:9, and the field doesn't say so.
- **Proposed:** "Opening = new composition with card:9. Learner turn 1 = new composition with card:4. Learner turn 2 = exact card:17. Cues and learner turn 3 = new compositions with card:6."

**4. The final turn doesn't answer the last cue.**
- The goal is "report that view", and the view given in answer to "What happened?" is "I copied it too quickly."
- Learner turn 3 instead reports the earlier cue ("You think there is a mistake").
- **Proposed:** "You think you copied it too quickly. Let's read the term again. Thank you." Adjust form:3's example to match.
- Separately, cue 3 closely mirrors the self-diagnosis slot in held reader:7 ("I think I didn't measure…"). It's acceptable as a new composition, but cite reader:7 as a structural parallel.

**5. Learner text contains internal notes.**
- `practiceContextEnglish` includes "not a roof-course observation". Move this to `scenarioProvenance`.
- `goalEnglish` includes "without selecting a field correction", but `goalFrench` omits it. Make them consistent, ideally by dropping the phrase from both learner-facing goals.

**6. Minor items:**
- `grammarExplanationFrench`: "sans en établir la cause" has no antecedent for "en". **Proposed:** "sans établir une cause avérée".
- "le mètre ruban" is France usage. Québec typically uses "le ruban à mesurer", so note this for the pending locale review.

## Cross-lesson notes

- Provenance errors in `speakingProvenance` appear in all three lessons. Regenerate this field from the turn sequence rather than writing it by hand.
- The `internalNotes` line is duplicated in all three lessons.
