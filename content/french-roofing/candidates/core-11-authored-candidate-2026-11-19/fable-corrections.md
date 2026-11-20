Review of the pasted JSON only: no files, packets or hashes were checked, so "exact source" claims are tested against the pasted `candidateRows` alone. These are read-only proposals, with no edits and no approval.

## Core 10
1. **`activity:write`, `form:3` — anchor contradicts provenance.** Both anchor only `card:14`, which the provenance says is not the exact anchor. `sourceVerbExamples[4]` is not in the paste and has no anchor ID. Proposal: give the verb example an anchor ID, or relabel as a new composition from `card:14`. Drop "repetir" from provenance.
2. **Objective vs speaking.** The objective says "repeat the plan", but the speaking task has no plan, since the plan is the held tarp/cover content (`card:9/11/12`). The goal and cue say "repeat those facts / your report". Proposal: change the objective to "…then repeat the report to confirm", or limit plan-readback to recognition in `hear`.
3. **`activity:type` — ambiguous prompt.** "le temps change" can mean time or weather, and it conflicts with `card:3` and `card:10` "la météo". Proposal: « La météo change. » The provenance also omits `card:10`, which is anchored and supplies the clause.
4. **`activity:recall` — three French versions.** The prompt is "Il y a une partie inachevée à l’arrière", but `expectedMeaningFrench` and `reader:3` say "Une partie à l’arrière n’est pas terminée", which hides the taught "there is = il y a". Proposal: align all three on the "il y a" version.
5. **Speaking word bank.** "rain" plus the cue "What is the weather like?" invites the held forecast content (`card:13`, `reader:2`), which is not in `heldDecisionRefs`. Proposal: drop "rain" or add those refs. "weather", "wind", "rain" and "unfinished section" also lack anchors (`card:3/5/4/2`).
6. **Hold consistency.** `card:10`/`reader:8` (stop work, come down) is unheld, while the tarp rows are held on the same site-weather/fall-protection decision. Proposal: propagate the hold or record why it is independent.
7. **Boilerplate hold on `card:11`/`reader:5`.** It cites "archived French paraphrases tarp", but the source says "Cover". Rewrite the hold per row.
8. **Minor.**
   - `activity:see` provenance names a "conditionalFrench" field that does not exist; it should be `candidateFrench`.
   - `form:2` lists "there are", which is unsourced and untaught.

## Core 11
1. **Leakage from held `reader:6`.** "check" and "again" appear in the paste only in `reader:6`, whose hold says "no dependent activity uses this face". Yet its predicate drives `say`, `write`, `form:1`, `form:3`, the grammar text and the word bank. Likewise "then" appears only in held `reader:3`. Proposal: disclose the derivation with the role subject removed and amend the hold note, or cite an unheld anchor. Add the role refs to `heldDecisionRefs`.
2. **"eave → l’avant-toit" is unheld (`card:4`, `card:10`, `reader:7`).** Avant-toit commonly denotes the overhanging part, so it collides with the held overhang/débord decision (`card:8`). Proposal: make it held-dependent on `card:8` and the locale choice.
3. **"Is the line straight?" depends on the held chalk-line term.** The referent in the source is the snapped chalk line (`card:1`, `reader:4`), so "la ligne" may change. Proposal: mark the French support on `card:11`/`reader:5` as held-dependent; the English is unaffected.
4. **Anchors.** `activity:recall` takes its verb from `card:12` but anchors only `card:5`. The speaking anchors also omit `card:12`.
5. **Speaking sequence.** The opening already asks "Is the line straight?", then cue 2 asks for it again. Cue 3 says "repeat" a request never made. "labelled example line" and "measurement-check request" are authoring language. Proposal: use "Please ask me to check the measurement." then "Please repeat that."
6. **Form mismatches.**
   - `write` uses ", then" while `form:3` teaches sentence-initial "Then".
   - "again" is rendered both "encore une fois" and "de nouveau".
   - Grammar FR "comme la forme vous" misleads, because the English imperative covers tu and vous. Proposal: "rendu ici par la forme vous".
   - `form:2` "être + sujet + adjectif" does not describe "La ligne est-elle droite ?".

## Core 12
1. **`activity:say` — meaning shift and misaligned answer.** "needs a pattern" becomes "doit … suivre un motif de pose". That prompt elicits "must follow", in a lesson teaching "must". Proposal: « Maintenant, chaque nouveau rang a besoin d’un motif de pose. » in the activity and `reader:2`.
2. **Speaking roles.** `partnerRole` says the partner repeats the question, but the cues have the learner repeat it. Cue 1 duplicates the opening, and cue 2 has no defined answer. "job-offset" and "without supplying an unapproved value" are internal guardrail wording, and "offset" is untaught. The objective's "joints must not line up" is never elicited. Proposal: use taught words ("Ask about the stagger for this job.") and move the guardrail to provenance.
3. **Hold text adds an untaken decision (`card:8`, `card:13`, `reader:7`).** It says "Confirm … with the lead/office before work". In the source the foreman asks the office, and work continues ("Meanwhile, check…"). Proposal: remove "before work" and "lead", and add the foreman/crew-lead propagation used in Core 11.
4. **`activity:hear`, `form:3`.**
   - `reader:8` is not exact, since it has "Meanwhile,"; only `card:14` is.
   - `form:3` says "sur", but the French uses "du rang suivant".
5. **`card:2` "stagger → le décalage".** It is called "not held", but the noun/verb alignment is an open point in the `card:10` hold. Proposal: mark it held-dependent.
6. **`activity:write`.** "But" contrasts with held `reader:4`, so note the dependency. It uses "every" while the grammar teaches "each".
7. **Grammar and prompts.**
   - The English explanation has a fourth point ("Each…") with no form and no French counterpart.
   - `form:1` should read "ne pas devoir + infinitif".
   - The recall prompt "est prévu" may elicit "is planned". Proposal: « Quel est le décalage pour ce chantier ? »

## Cross-lesson
- **Locale.** "ruban à mesurer", "pouce", "avant-toit" and "bardeau" lean Canadian French, but no locale is declared.
- **Scenario provenance.** The same boilerplate ("actual weather forecast") is pasted into Core 11 and 12.
- **Provenance format.** "Not held" is stated on some rows and missing on others.

Fable reviewed the same initial self-checked candidate snapshot as Opus, before those corrections were written. Their proposals were merged with source-grounded final corrections. Most overlapping issues had already been corrected from Opus: report/plan scope, generic-line versus chalk-layout, source discourse/translation and exact/related anchors. The exact repetir source example is verified directly from the real pinned source array, not invented or model-approved. All selection, audio, progress and qualified review gates remain false.
