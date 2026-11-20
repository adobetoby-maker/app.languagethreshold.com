# Review: core-roofing 10–12 (fr-en)

These are read-only correction proposals based only on the pasted JSON. I have not checked files, hashes or the source packets, and this is not an approval. All gates remain false.

## core-roofing:10

**1. The objective, speaking goal and plan do not line up.**
- The objective says "repeat the plan to confirm."
- The speaking goal says "repeat those facts," and the partner cue says "repeat your report."
- In the source, "the plan" is the tarp/cover plan (card:9/11/12, reader:5–7), and those rows are held.
- **Proposal:** Change the objective to "…then repeat the report to confirm."
- Keep "Repeat the plan to confirm" (card:14/reader:9) only as a bare readback phrase. Tell learners that the plan's content is not taught here.

**2. The `type` anchor contradicts its provenance.**
- The anchors include card:10 ("Stop work and come down if the weather changes"), but the provenance says the activity is not a stop-work instruction.
- "The weather changes." is that card's conditional clause pulled out as a standalone present-simple sentence. On its own it reads as a general habit statement.
- The prompt and answer use "le temps change," but card:3 gives *la météo* and card:10 gives *la météo change*.
- **Proposal:** Remove card:10 from the anchors. Label the activity as a new composition from card:3 only. Pick one French word for "weather" (*le temps* for conditions, or *la météo*) across card:3, card:10 and this activity.

**3. The holds on wind-triggered work rules are inconsistent.** This is a question to decide, not a decision.
- Card:9/11 are held as possible "universal high-wind work instruction" and for the site-weather/fall-protection decision.
- Card:10 and reader:8 are an unconditional stop-work and come-down rule, yet they are unheld and have candidate French.
- **Proposal:** Have the qualified trade/safety review decide whether card:10/reader:8 belong under the same site-weather decision. No dependent activity should use them until that is decided.

**4. The speaking section leaks toward held rain rows.**
- "rain" is in the word bank, and the cue "What is the weather like?" invites a forecast answer.
- Every rain sentence is held: card:13, reader:2 and reader:4.
- `heldDecisionRefs` leaves out card:13 and reader:2.
- **Proposal:** Remove "rain" from the word bank, or add card:13/reader:2 to `heldDecisionRefs`. Narrow the cue to "Is it windy?"

**5. The French for reader:3 and card:2 is inconsistent.**
- The recall prompt says « partie inachevée à l'arrière ».
- The expected meaning and the reader:3 row say « Une partie à l'arrière n'est pas terminée ».
- **Proposal:** Use one rendering, ideally the one that reuses card:2's *la partie inachevée*.

**6. Provenance and anchor hygiene.**
- The `see` provenance refers to a "conditionalFrench value," which is not a field in this record. It should say `expectedMeaningFrench`.
- In `write` and form:3, `sourceAnchors` lists only card:14, while the provenance says the exact source is `sourceVerbExamples[4]`. Either add a resolvable verb-example anchor, or record card:14 as "related."
- *Les prévisions météorologiques* (card:6) is a formal register. It should be checked together with the reader:2 hold on a natural French forecast expression.

## core-roofing:11

**7. "Is the line straight?" depends on held content.**
- In the source, reader:5 comes right after held reader:3–4 (run/stretch/snap the chalk line). "The line" means the held chalk line.
- **Proposal:** Either mark card:11 and reader:5 as linked to the card:1 hold, or keep card:11 as the anchor and drop reader:5.
- Learner-facing context should treat "line" as generic, as the partner role's "labelled example line" already does.

**8. The `hear` activity's "Measure from the edge." is layout-method language.**
- The source meaning comes from held reader:2, "from the edge of the eave," which is tied to the plan points and the overhang decision.
- The provenance claim "no installation location is named" is true of the words but not of what they mean in the source.
- **Proposal:** Add card:8 and reader:2 to this activity's dependency note, or replace it with a phrase that has no held referent.

**9. "Eave" is unheld while "overhang" is held.**
- *L'avant-toit* often names the projecting part itself, which overlaps with the held "overhang" (card:8, *débord may be broader*).
- *Le ruban à mesurer* (card:5) is a regional term; France more often says *mètre ruban*.
- **Proposal:** Put card:4 under the same locale and trade check as card:8. This also carries over to card:10 and reader:7 ("Start here at the eave"), which are layout start-point instructions next to the held first-course method.

**10. "Again" comes from a held row but is labelled as source wording.**
- Form:1 and the grammar text use "Check the measurement again," with provenance "the source word *again*."
- The only source for "again" is held reader:6, which `say` explicitly excludes.
- **Proposal:** Label "again" as new wording, or anchor it honestly with a held-dependency note.
- Also align the French: the grammar text says *encore une fois*, while `write` says *de nouveau*.

**11. The `write` target is semantically odd.**
- "Measure again, then check the measurement." is nearly redundant.
- The grammar teaches "Then" + imperative as a separate sentence, but the target uses ", then."
- **Proposal:** "Measure with the tape measure. Then check the measurement." with a matching French prompt.

## core-roofing:12

**12. The `say` prompt does not match its answer.**
- The prompt « Chaque nouveau rang doit maintenant suivre un motif de pose » back-translates as "must now follow a laying pattern."
- The expected answer is "Now each new course needs a pattern."
- **Proposal:** Use « Maintenant, chaque nouveau rang a besoin d'un motif. » for the prompt and the reader:2 row, or accept *must follow* as a variant.

**13. The `write` activity depends on held reader:4.**
- "But every job is different." only makes sense as a contrast with the held six-inch guide line.
- Its own provenance says it "Supports the contrast between the general guide example and the job."
- **Proposal:** Add card:10/reader:4 to its dependencies, or drop "But" and label the result as a new composition.

**14. The form:3 mapping does not match its example.**
- `meaningFrench` gives "sur + groupe nominal," but the example French is *du rang suivant*.
- **Proposal:** Change the form to "de + groupe nominal," or remove the on→sur mapping.

**15. The grammar text is not the same in both languages.**
- The English covers "Each + singular verb." The French does not.
- The `write` target uses "every," which neither text covers.
- **Proposal:** Add the each/every point to the French explanation, or remove it from both.

**16. The speaking section leaves out half the objective.**
- The objective includes "say that the joints must not line up," but the goal and cues only ask and repeat the stagger question.
- **Proposal:** Add a cue such as "What must the joints not do?" with the expected answer from card:11.

**17. The hold on *chantier* is not applied consistently.**
- Card:8's hold puts *chantier* under regional/register review.
- *Chantier* still appears unheld in card:12, reader:5, reader:6 and three activities.
- **Proposal:** Either narrow the card:8 hold to *spécification*, or apply the *chantier* review to those rows.

## Cross-cutting

- In lessons 11 and 12, `scenarioProvenance` is boilerplate that mentions an "actual weather forecast," which does not apply to them. Make it specific to each lesson.
- Domain and speaking notes are appended inside the `hold` strings ("Source speaking asks… Archived speaking adds…"): card:9 in 10; card/reader:9, reader:3 and reader:8 in 11; card:10/13 and reader:4/7 in 12. Moving them into `internalNotes` would keep holds limited to the sense decision.
- I saw no ladder setup method or triage decision anywhere. "Descendez" in card:10 stays a bare source instruction.

Source-grounded corrections applied to report-versus-plan task scope, linked layout/chalk/eave dependencies, exact verb-example provenance, generic line context and current-job discourse/translation alignment. The critique’s unconditional label for Stop work…if the weather changes was rejected: the exact source condition is explicit and preserved. Models did not check files; independent validators do. All qualified review stays open.
