# Correction proposals: core-roofing 1–3 (fr-en)

This is a read-only review. I made no edits and approve nothing. I checked against the `sourceEnglish` rows you supplied. I did not open the referenced packet files or check their hashes.

## Cross-lesson

1. **The French grammar notes in L1 and L3 teach French, not English.** Both explain French word order (and, in L3, the gender of *noue*). For an English-target lesson, the French note should explain the English rule in French. L2 does this correctly. Proposals are below.
2. **"source-exact" is ambiguous.** The English targets are exact source text, but every `promptFrench` and `expectedMeaningFrench` is unreviewed candidate French. Suggest splitting the label into "English: source-exact; French: candidate support", or adding a separate French provenance field.
3. **Speaking tasks quietly replace the source speaking task.** The L1 Reader 4 hold says the source task is telling a crew member. The L2 Card 1 hold says it is pointing out deck, underlayment and edge on a roof plan. In L1 and L2, the candidate speaking is a narrower "ask about a labelled sample" task. Neither `speaking` block says so. Add a line such as: `"objectiveProvenance": "New narrower practice task; source speaking objective (…) remains held."`
4. **Typography and register are inconsistent.**
   - Apostrophes: L2 uses straight `C'est` in activities but curly `c’est` in forms.
   - Quotes: L2 and L3 wrap some prompts in « », while L1 and the other L3 prompts do not.
   - Diagram vs image: L1 says "diagram" in the roles but "images" in `scenarioProvenance`.
5. **Some holds are generic boilerplate.** The "material, deck, drip-edge, shingle or foreman" text has a leading space and doesn't name the actual blocker. For example, L1 Card 12 has no drip-edge, and L2 Card 11 is about deck. Each hold should name its specific linked term.
6. **No issues found** on held-row leakage into activities, ladder or access methods, or triage decisions. No activity uses a held row.

## L1: core-roofing:1

- **French grammar note:** replace with: *« En anglais, l’adjectif se place avant le nom : flat roof (toit plat), sloped roof (toit en pente). Dans une question avec is, le verbe vient avant le sujet : Is the roof flat or sloped? »*
- **"roof pitch" isn't covered by the grammar.** It is a noun + noun compound, not adjective + noun. Either add one line about it or note that it is taught as a fixed term.
- **Speaking goal mismatch.** The goal says "Ask **and answer**", but the learner only asks; the partner cue gives the answer. Change the goal to "Ask one question…", or add a learner answer turn.
- **Form 1 anchors** cite `card:7` (flat) but not `card:8` (sloped), yet the example uses both. Add `card:8`.
- **Ambiguous French "pente".** The recall prompt `la pente du toit` → `roof pitch` and the type prompt `le toit en pente` → `sloped roof` share the word "pente". "roof slope" is a plausible learner answer. Record accepted alternates before scoring is enabled.

## L2: core-roofing:2

- **Objective vs content.** The objective says "Identify", but the grammar, the write activity and form 3 also teach *Where is…?* Add "and ask where one item is" to the objective.
- **Duplicate item.** Recall and type both test plywood ← `le contreplaqué` (card 8). Suggest swapping type to card 13: *Tapez en anglais : Déroulez la sous-couche.* → `Roll out the underlayment.` That row is source-exact and not held. Reader 7's command-force hold covers only the Reader line.
- **Speaking.** The goal includes "identify plywood", but no partner cue prompts it. Add a second cue, e.g. "And this card?" (labelled new).

## L3: core-roofing:3

- **Objective overclaims.** It lists "chimneys and walls" as things to locate, but only valleys, flashing and chimney are asked about. Wall appears only in the type activity. The list also echoes Reader 2, which is held. Proposal: "Ask where valleys, flashing and a chimney are shown on a sample diagram."
- **French grammar note:** replace with: *« En anglais, la question de lieu commence par Where. Avec un nom pluriel, on dit are : Where are the valleys? Avec un nom singulier, on dit is : Where is the chimney? »*
- **The English grammar note covers only plural "are".** But the write activity and form 3 use singular "is". Add the singular line.
- **Inconsistent French for "where is".** Form 3 gives `où se trouve … ?` but the write activity expects `Où est la cheminée ?` Align them on one form, or list both.
- **"doit aller" adds obligation.** `Montrez-moi où doit aller le solin.` means "must go". `Montrez-moi où va le solin.` is closer to the source "goes". This affects the say activity and the Card 12 and Reader 7 rows.
- **Reader 6 assigns gender.** `Une ouvrière montre la noue à l’avant.` gives the source's neutral "A worker" a gender, and "montre" weakens "points to". Proposal: `Un membre de l’équipe indique la noue à l’avant.`, or flag it as a deliberate choice for review.
- **Speaking provenance.**
  - The partner cue ("the valley is at the front") reuses the Reader 6 scene but is labelled only "new hypothetical". Either add a `reader:6` anchor or note that it is derived from Reader 6.
  - The partner role "lead" sits close to the held foreman sense (Reader 5) and to the archived "ask a lead" substitution. "coworker" would match L1 and L2.
- **Minor register mix:** Reader 1 uses *toiture*, while other rows use *toit*. Choose one deliberately.

Source-grounded corrections applied to English grammar support, form patterns, source versus French provenance, task scope, exact linked holds, role/goal/anchor alignment and French location meaning. Core2 command substitution was declined: identification practice stays narrow rather than adding method instructions. All qualified review remains open.
