# Shared batch read-only critique

Review of the pasted JSON only: I could not check the packets, hashes, or any "exact source/archive" provenance claim, and nothing here is qualified approval. All proposals are read-only.

**What holds up:** no activity, form or speaking anchor points to a held row. Every `heldDecisionRefs` list matches the held rows. `expectedMeaningFrench` matches the candidate rows, and gates, `selectedFrench` and `audioScript` are closed throughout. No ladder-setup or triage content appears in the learner text.

## Cross-cutting

1. **Role inversion is unrecorded.** In all three source speaking tasks the learner is the crew lead or trainer; in all three candidates the learner is the new hire. Provenance says "new dialogue" but never states the inversion.
   - M1 `practiceContextEnglish` ("a vocabulary review with a new hire") contradicts `learnerRole`.
   - The M2 card 18 hold says the source asks for a "new-hire teach-back", while `sourceSpeakingEnglish` has the crew lead explaining.
   - Proposal: state the inversion in `provenance` and fix the M1 context line.
2. **Unresolved senses are used as sole answer cues.** M1 recall uses « le faîte », M1 hear expects « le bardeau d'asphalte », M2 say uses « la fuite », and M3 type uses « le tuyau souple ». Each has open `qualifiedFrenchOptions`. Proposal: flag these four activities as option-dependent, or swap in terms without open options.
3. **Metalanguage drifts.** English alternates term, phrase and label; French alternates terme, groupe, expression, étiquette and « repère temporel » (M2 `goalFrench`). Proposal: fix term↔terme, phrase↔expression, label↔étiquette, and replace « groupe » in learner prompts. M3 write says « groupe » where form 2 says « terme » and drops « sur la fiche ».
4. **Punctuation contradicts the declared en-US convention.** New English puts commas and periods outside closing quotes (`"the layer", then`; `"as time passes".`). This matters for write/type answer keys. Prompts also nest « » inside « ».
5. **Word banks do not cover the expected turns.**
   - M1 lacks "I would like", "printed here" and "say it aloud".
   - M2 lists four nouns no turn uses and lacks "means", "on line C" and "unclear".
   - M3 uses "Could you" in three turns, but its grammar note covers only imperatives.
6. **Boilerplate does not fit these lessons.** "Fall-protection", "approved gear" and "protection-system check" appear in notes and `scenarioProvenance`; M1 and M2 have no picture.
7. **Review claims read as fact.** "Opus proposals source-checked" and "Fable reviews them" should be reworded as AI review pending, not approval.
8. **`archivedHeaderModuleId` is inconsistent.** It is "roofing" in M1 and null in M2 and M3, yet all three notes cite the legacy roofing header.

## MASTER1

- **Partner cue 1 embeds unselected French in target English.** "It means "la couche"" puts an unreviewed candidate into an English cue. The second request ("the asphalt shingle") is then never explained, only located. Proposal: make both replies locate the term ("It is on line A/B") and keep glosses in the French support fields.
- **Stale provenance on held rows.** Cards 20 and 21 and reader 7 carry `candidateFrenchProvenance` ("conditionalFrench copied") while `candidateFrench` is null. Proposal: remove it.
- **Hold reason mismatched.** Card 15 and dictionary 15 carry the water-path hold, while the identical sentence in reader 3 carries the deck-to-ridge sequence hold. Reader 15 has the same problem.
- **Reader 1 French loses source meaning.** « arrive dans l'équipe » drops "first day", and « avant de monter » makes Rogelio alone the subject. Proposal: « …c'est le premier jour de Kevin dans l'équipe, et Rogelio lui explique le système de toiture avant qu'ils montent. »
- **Reader 2 drops "all".** Proposal: « elles fonctionnent toutes ensemble ».
- **Say provenance mixes labels.** It says "archived conditional evidence", while the row says source-packet `conditionalFrench`. The M3 say provenance has the same mix.

## MASTER2

- **The complication invites held content.** It has the partner improvise "a statement about roof performance", which is exactly the held causal and late-leak material. Proposal: use a non-technical complication, such as the partner asking for a repeat or spelling.
- **Form 3 and the opening adapt source card 20 without saying so.** "May I explain why?" is a formal crew-lead-to-homeowner line; the provenance calls the form a new composition and does not record the register transfer.
- **Card 18 hold reason is wrong.** Card 18 and dictionary 18 carry the grammar-authoring hold; reader 9, the same sentence, carries the late-leak hold.
- **Reader 12 shifts meaning.** « pose … une question » says "asks" where the source says "has". Proposal: « a elle aussi une question ». « la cour » for "yard" is locale-dependent.
- **Type provenance is inaccurate.** It says "with its original article", but "over time" has none.
- **Archive option risks misreading.** « la bande adhésive » for "sealant strip" can read as adhesive tape; flag for the trade reviewer.

## MASTER3

- **Cue 1 and turn 1 misalign.** The partner asks "Which one would you like to read first?" and the learner asks the partner to read. Proposal: "Which one should I read first?"
- **French gender errors.** With « étiquettes » as antecedent, « Lequel » should be « Laquelle » and « Le voici » should be « La voici ».
- **Register slips in turn 3.** The new hire gives a bare "Don't skip that label." after "Could you…" requests. Proposal: "Please don't skip that label."
- **Grammar note is ambiguous.** "It can refer back…" reads as the imperative referring back. Proposal: "The pronoun "it" can refer back…".
- **Form 1 provenance contradicts the say activity.** Form 1 is source card 18 plus "in the picture", not a wholly new composition.
- **Nail-gun locale is noted but not recorded.** The notes say it is open, but dictionary 1 has no options or scope note. "The hole" also lacks a scope note separating it from held hole-sealing.
- **Card 20 hold adds "older".** The pasted source says experienced, not older.
- **Card 19 French mixes registers.** Proposal: « Ne t'inquiète pas, ça nous est arrivé à tous. »
- **Archive option is incomplete.** « à fleur » for "flush" normally needs a complement.

## Minor

- « verbe de base » would read better as « base verbale ».
- M2 and M3 French grammar notes add a sentence the English lacks.
- Article-prompt wording varies between « avec son article » and « avec son article s'il en comporte un ».
