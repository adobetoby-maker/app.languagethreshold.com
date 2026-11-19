# Read-only critique: foundation-roofing 5 and 6 (fr-en)

**Hold integrity:** No held row has a `selectedFrench`, `candidateFrench` or dictionary sense. Activities and wordbanks leave out the held cards. The problems below are about leakage and consistency, not about held rows being selected.

## Lesson 5

**Material**

1. **The objective and grammar depend on held content.** The objective "what you can do" and the grammar line "Can + base verb… Can you help me?" teach card 10 / line 5, which are held for tu/vous. No unheld row uses *can*, so the stated objective can't be met with selectable content. Either remove *can* from the objective and grammar until the hold clears, or mark that part as held.
2. **The speaking role contradicts the goal.** The role "Crew member: the person you ask for help" sets up a help request. The goal says the help-request register "remains held." The role should not invite the held request.
3. **Speaking provenance contradicts itself.** The block says "mixed: source closure, newly-authored opening." But `closure.provenance` is "newly-authored conversational closure" with `sourceAnchors: []`. Also, `line:7` sits in the speaking anchors without being used anywhere. It may have been the intended source closure.
4. **The hear target has a gloss in it.** The hear activity's `candidateTargetEnglish` is "It's hot (weather)." "(weather)" is an annotation, not something a speaker would say, so it shouldn't be in a listening stimulus or future audio script. Form 2's example has the same problem. Use "It's hot." as the spoken text and keep the gloss in metadata.

**Minor**

5. **Closure has no French.** The opening has `french` and `english`, but the closure has only `english`. French support is missing there.
6. **Answers need alternates for scoring.** "On commence." can also mean "We're starting" or "We start." "Je vais monter." can be "I'll go up." Add accepted alternates before scoring is turned on.
7. **Line 6 touches the card 4 hold.** "After that" / "Après ça" uses the *after* sense that card 4 holds. The sense here is unambiguous, so this is low risk, but record the dependency.
8. **"Do" is grouped with the plan constructions.** In "do the cleanup," *do* is an ordinary main verb, not a plan or ability form. Putting it next to *be going to* and *can* could confuse learners.
9. **Dictionary context says "requests."** The `contextEnglish` value "plans and requests" refers to request rows that are all held.

## Lesson 6

**Material**

1. **The objective carries over a Spanish concept.** "with regular verbs" comes from the Spanish source's -ar verbs. The English targets include *go*, *get* and *eat*, which are irregular. For English present simple, the regular/irregular distinction doesn't apply anyway. This conflicts with the note "source Spanish grammar is provenance only."
2. **Register is inconsistent across lessons.** Card 11 "Where do you live?" uses "Vous habitez où ?" and is not held. Lesson 5 holds cards 10 and 5 precisely because tu/vous for crew talk is undecided. Hold card 11 as well, or resolve register once for the whole course.
3. **"the work, the job" is a two-sense English row, but isn't held.** Lesson 5 holds card 4 ("after, later") for exactly this kind of grouping. Here the same pattern is the see activity's scored target, and *job* doesn't map cleanly to *le travail*. Hold it or split it, to match the lesson 5 policy.
4. **Speaking provenance contradicts itself again.** The block says "source opening and closure," but the closure is newly authored and has no anchors.

**Minor**

5. **Typo in the grammar text.** "A singular crew takes gets" should read "takes *gets*."
6. **Dependencies on the card 6 "the day" hold:**
   - Line 7 "à la fin de la journée" uses *journée* in its span sense, which is probably correct.
   - Line 1 "cinq jours par semaine" uses the calendar sense.
   - Neither is held, but both depend on card 6's sense decision, and the goal's "end-of-day cleanup" relies on line 7.
   - The speaking anchors leave out line 7 even though the goal uses it.
7. **Small form issues.** Form 1's `englishForm` "I work on roofs" has no final period, unlike the other forms. Form 3 anchors only card 12, not line 7.
8. **"the lunch" headword.** English normally says "lunch" without an article here, so the headword reads oddly. It probably reflects the source's article.

## Cross-lesson

The register and multi-sense policy is applied unevenly. Lesson 5 holds tu/vous and two-sense rows, while lesson 6 lets both through (card 11, card 1). Settle course-level register and locale once and apply it to both lessons, together with the lesson 6 *déjeuner* locale hold.

Source-grounded corrections applied to objective/direction, register/sense hold propagation, speaking role/provenance, hear gloss, source dependencies and invitation meaning. Qualified review remains open.
