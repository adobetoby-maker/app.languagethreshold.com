# Critique: foundation-roofing:3 and :4 (fr-en inert candidates)

All source anchors are present. Every held row (L3 `card:2`, L3 `line:7`, L4 `card:5`, `card:6`, `card:12`, `line:5`, `line:6`, `line:7`) still has a null candidate with its hold text intact, and the dictionary holds match the card holds. No held meaning shows up in an objective, activity, word bank or form. The issues below are the material mismatches.

## Lesson 3

**1. Grammar text leaks the Spanish source language (material).**
`grammarExplanationEnglish` says "do not import Spanish ser/estar as two English verbs." The learner here is French-native, and your own `internalNotes` say Spanish is provenance only, not the learning objective. A French-native learner has no ser/estar to import, so this sentence is source scaffolding left in learner-facing text.

**2. Speaking roles contradict the opening line (material).**
`learnerRole` is "roofing crew member" and `partnerRole` is "crew lead." But `candidateOpeningEnglish` has the learner say "I'm Pedro and I'm the crew boss." That makes the learner the boss while their partner is the lead. The source line 1 speaker is Pedro, the crew boss, so either the roles or the opening must change.

**3. The write prompt asks for third person; the target is first person (material).**
"Présentez Pedro et sa fonction en une phrase anglaise" invites "This is Pedro, he's the crew boss." The target and the source anchor `line:1` are first person: "I'm Pedro and I'm the crew boss." The prompt needs to frame the learner as Pedro introducing himself.

**4. `card:11` "Is it ready?" → "Est-ce qu'il est prêt ?" (minor).**
The source "it" has no referent, but `il` commits to a masculine noun. The gender-neutral equivalent of the bare source is "Est-ce que c'est prêt ?"

## Lesson 4

**5. The hear prompt doesn't match the expected meaning (material).**
"Dites en français ce qui manque" asks what is missing. The answer to that is the water. But `expectedMeaningFrench` is the whole of `line:2`, including "il fait très chaud," and heat is not something missing. Either ask the learner to restate the sentence, or narrow the expected meaning to "il n'y a pas d'eau."

**6. The write activity uses a "say" verb (minor).**
`mode: "write"` but the prompt opens "Dites en anglais…". It should be "Écrivez…".

**7. `card:4` "the hard hat" → "le casque" (minor).**
Bare `casque` is ambiguous (it also means helmet or headphones). "Le casque de chantier" pins down the source sense. This is low priority because the scene context helps.

## Both lessons

**8. Speaking closure has no source anchor (material).**
`closureEnglish` "Thank you. Please repeat that." is not anchored to any source line. It also works as a repair request, not a closure. That conflicts with the "exact source scene" claim in the L4 goal.

**9. Apostrophes differ between targets and their anchors (material if exact matching is ever enabled).**
These activity and speaking targets use curly apostrophes, while the source rows they point to use straight ones:
- "I’m here."
- "It’s dangerous."
- "I’m Pedro…"
- "There’s no water…"
- "There’s a problem…"
- "I’m thirsty."

Prompts and `expectedMeaningFrench` also mix the two styles (for example "C’est" vs "C'est", "J’ai" vs "J'ai"), and so do L3 `line:4` and L4 `line:3`. Scoring is off now, but these would fail exact match against their anchors.

**10. `dictionaryMappings.contextEnglish` is applied too broadly (minor).**
L3 tags every entry "identity and roof conditions," including "ready," "Is it ready?" and "I'm here." Those are about equipment readiness and presence, not identity or roof conditions.

No files were edited.

Source-grounded corrections applied: English-only grammar explanation, speaker role and prompt alignment, neutral it, task/meaning alignment, specific hard-hat sense, explicit newly authored closure provenance, apostrophe normalization and dictionary context. Qualified review remains open.
