The three source packets in `sourcePacket.path` (`core-7/8/9-source-decision-2026-11-18/packet.json`) are not in this worktree, and no copies exist elsewhere in the repo. I checked each candidate only against its own embedded `candidateRows`. I could not confirm the source wording, the "exact source" claims or the SHA-256 hashes. All items below are proposals, and nothing was edited.

## Across all three lessons

**Held references point at unheld rows.** Each `speaking.heldDecisionRefs` lists a row with `hold: null` that the lesson then uses in an activity:
- core-7: `card:14` is used in `write` and `form:2`.
- core-8: `card:15` is used in `say`, `form:2` and the grammar explanation.
- core-9: `card:5` is used in `see`.

Fix this one of two ways: hold the row and remove it from the activities, or point the refs at the rows that are actually held:
- core-7: `card:10`, `card:12`, `card:13`
- core-8: `card:12`, `card:13`, plus `card:15` if held per below
- core-9: `card:10`, `card:13`, `card:14`

## core-roofing:7

1. **`grammarExplanationFrench` punctuation.** French spacing has been applied inside English quotes: « Is that clear ? » and « Do you understand… ? ». Use « Is that clear? » and « Do you understand…? ».
2. **`grammarExplanationFrench` overgeneralizes.** "La question fermée commence par do ou is" implies these are the only openers. Proposed: « Dans ces exemples, la question fermée commence par *do* ou *is*. »
3. **Task/objective misalignment.**
   - The objective says the learner asks for confirmation of understanding, but the speaking task only uses "Is that clear?" about a vocabulary label.
   - "Do you understand…" never appears in the speaking task.
   - `layer` is in the word bank but is never needed for the goal.
   - Proposed: drop `layer` from the word bank, or narrow the objective to "name a hand tool and ask whether it is clear."
4. **Role drift in the `write` prompt.** "demander si **l'équipe** comprend" adds a group addressee. The objective says "a crew member," and the source line is addressed to "you." Proposed: « Écrivez en anglais la question : « Comprenez-vous ce qui doit être retiré ? » »

## core-roofing:8

1. **Triage decision leak (the most serious finding).**
   - "We need to replace this plywood." is a replacement decision, but `card:12` says a qualified person must assess the deck first.
   - It currently appears as the `say` production target, as `form:2`, and in both grammar explanations. The internal note's disclaimer does not reach the learner.
   - Proposed: hold `card:15` and `reader:8`, and replace the need-to example with a non-decision use built from source words, labelled as a new composition. Example: "We need to mark this panel."
   - Then retarget `say`, either to that labelled composition or to an unheld source row such as `card:14` "Mark the damaged area." If `say` uses `card:14`, give `hear` a different source row.
   - Drop "replacement" from the objective.
2. **The partner cue contradicts its own provenance.** "I can see the marked area." implies marking has been done, while `partnerCueProvenance` says there is no actual marking action. Proposed cue: "This is the damaged area." It describes the label only.
3. **Terminology is inconsistent.** `grammarExplanationFrench` says "verbe de base," but `form:2` says "verbe à l'infinitif." Use « forme de base du verbe » in both.
4. **`form:3` breaks the pattern of the other forms.**
   - `englishForm` uses "+ singular noun" where the others use `[noun]` slots.
   - `meaningFrench` is just a translation, not an explanation of use.
   - Proposed: `"Where is the [noun]?"` with « Question pour demander où se trouve un élément (nom singulier). »

## core-roofing:9

1. **The objective does not match the activities.**
   - "broom" is in the objective but no activity or speaking item uses it.
   - `magnet` (`see`) and "Pull all the old nails." (`write`) are taught but are not in the objective.
   - Proposed objective: "Name a magnet, shovel, wheelbarrow and gloves; give a glove reminder and a nail-pulling instruction in a practice exchange."
2. **Held tear-off sense leaks across lessons.** `reader:1` translates "tear-off" as « la dépose » with `hold: null`. In core-7, "tear-off" (`card:1`, `reader:1`) is held on the scope decision. Proposed: hold `reader:1` here with the same linked tear-off reason.
3. **`reader:6` has a scope problem and a sense problem.** "Then run the magnet over the yard." is unheld, but `reader:8` holds the same ground-control scope.
   - Scope: hold `reader:6` with the `reader:8` ground-control reason, or add that reason to it.
   - Sense: « la cour » usually means a courtyard, not a residential yard. Flag for the French reviewer; « le terrain » or « le jardin » are possible depending on locale.
4. **Minor grammar point.** "'all the' is followed by a plural noun" is accurate for this example, but the same lesson uses "debris," which is uncountable. Proposed: "a plural or uncountable noun," or scope the rule to the example.

## No change proposed

- Imperative register is consistently formal *vous* in all three lessons: Utilisez, Comprenez-vous, Marquez, Mettez, Retirez.
- Labels separating new compositions from source rows are present and accurate.
- Internal notes are kept separate from learner text.
- No ladder setup method appears in any of the three lessons.

Source-grounded corrections applied to held decision references, speaking subset scope, source-question addressee, replacement decision production hold and cross-lesson tear-off/magnetic-operation holds. The critique’s claim that source packets were absent is incorrect: this tools-disabled CLI saw pasted candidate data only; independent validators directly verify the actual source packet paths and hashes. No clinical triage was involved; the relevant issue is structural assessment. No AI claim is qualified approval.
