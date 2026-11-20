# Shared batch read-only critique

# Review: core-roofing 22–24 (fr-en), pasted JSON only

I checked only the pasted JSON. I did not open the source packets, verify the sha256 values, or check the archived French. Each item below is a correction proposal, not an approval.

## Cross-cutting

1. **French prompts end with doubled punctuation.** Examples: `« Où est la corde ? ».`, `« Montrez-moi le harnais. ».`, `« Comment vous sentez-vous ? ».`. This affects 22 type/say/write, 23 say/write and 24 write. Drop the period after the closing guillemet.
2. **The internal-notes boilerplate is wrong for 23 and 24.** In both, "does not replace a fall-protection/source decision" should say weather/footing for 23 and heat/occupational-health for 24.
3. **Some holds carry the wrong generic reason.** The text "Linked unresolved product, substrate, role or coverage sense…" appears on:
   - 22 card 12 ("Where is the competent person?"). This should cite the competent-person role hold.
   - 22 reader 2 ("He stops and tells the foreman.").
   - 24 reader 6 ("Raúl answers yes, a little."). This should cite the dizzy symptom hold, because it is the answer to "Are you dizzy?".
4. **No ladder-setup method or triage decision is asserted in learner text.** The held clusters stay out of the activities, apart from the points under 22.1 and 24.3.

## Lesson 22

1. **Held-row leakage via "inspection card".** In real fall-protection use, "inspection card" reads as an equipment inspection tag or record. That edges into the held "documented result" and competent-person inspection issues (card 14, reader 6).
   - Change the turn and word bank to **"Where is card C?"**
   - Keep "inspection" only as the printed word.
2. **Write task/answer alignment.** "The card says inspection." mentions a word without marking it, so scoring will be ambiguous.
   - English: **The card says "inspection".**
   - French: **La carte indique « inspection ».**
   - Also apply the quoting to form 3's example.
3. **Rope versus lifeline.** "rope / la corde" is unheld, but "lifeline" (card 2) is held. Add an internal note that "la corde" must not be read as, or later reused for, "corde d'assurance / ligne de vie".
4. **Note for reviewers on card 9 "stop work" (arrêter le travail).** The noun form "arrêt de travail" means sick leave in French. A site reviewer may prefer "interrompre les travaux". This is internal only, since the card is not used in the lesson.
5. **Hold wording is ambiguous.** "Reader 6 adds required clearance absent from the source" reads as if the source English added it. Change it to **"Archived French Reader 6 adds…"**
6. **Source inconsistency to record internally.** Reader 1 uses "they" and reader 2 uses "He". Do not edit the source; just note it.

## Lesson 23

1. **The English target is unidiomatic.** "There is wind." is a calque of "Il y a du vent"; "There is rain." is marginal.
   - Use the source's own pattern instead: reader 1 says *"there is still dew on the roof"*, and that row is unheld.
   - Form 2 example and say activity: **"There is dew." / « Il y a de la rosée. »** (anchors: card 1, reader 1).
   - Picture answers: **"Picture B shows rain." / "Picture C shows wind."** These are labelled as new composition.
2. **Wasted speaking turn.** "Please repeat your last sentence." makes the learner repeat "There is wind." twice. Replace it with a third distinct item, for example picture D with dew → "There is dew."
3. **Possible wrong sense for "boots" (les bottes).** The source means work boots with grip (card 15). "Bottes" usually means tall boots or wellingtons.
   - Mark it `qualifiedSenseReviewPending`, with alternatives such as "chaussures de travail / de sécurité".
   - Until then, consider holding the write activity.
4. **Reader 5 nuance (internal).** "le vent se lève" means the wind is rising or starting. "Picks up" means it strengthens, which is closer to "le vent forcit / se renforce".
5. **Form 1 is unused.** "It is wet." appears in no activity. Either drop it from the objective's "descriptions" or add one activity that uses it.

## Lesson 24

1. **Source note leaks into learner text.** The practice context says "unrelated to Raúl's source scene", which belongs in `scenarioProvenance` or the internal notes. The learner-facing context should be only: "Card A says shade, card B says water."
2. **Pragmatics and source-meaning drift.** "How do you feel?" is not a greeting in English. In the source it is a wellbeing check on someone who looks unwell.
   - Learner role: **"A learner asking a partner how they feel, then requesting cards."**
   - Remove "greeting" and "social greeting" from both roles.
   - Keep the partner reply neutral, e.g. "I feel fine, thank you." This avoids any symptom or triage content.
3. **Leakage near the held heat response.** The form examples "Where is the shade?" and "Show me the water." sit close to held cards 13 and 14 ("Go to the shade and rest", "Drink water now"). "Show me the water" is also odd English.
   - Use **"Where is the shade card?" / "Show me the water card."**, matching the speaking section.
4. **The form does not match the expected turn.** "This is the water card." uses a pattern that no form or grammar explanation teaches, and it only repeats the partner's line. Replace it with a taught form, e.g. **"Where is the water card?"**, with the partner answering "Card B."
5. **French reader rows drift from the source** (unheld, but unreviewed):
   - Reader 3 "…, alors le contremaître s'approche" adds causation that the source's "and" does not have. Use **"et le contremaître s'approche"**.
   - Reader 4 "Il lui demande" drops "the foreman". Use **"Le contremaître lui demande : …"**.
6. **Hold consistency for card 15.** "Tell me if you feel sick." is unheld, while reader 8 holds the same clause under the occupational-health hold. Also, "feel sick" can mean nauseous, while "se sentir mal" means unwell or faint.
   - Either hold card 15 with reader 8, or add an internal sense note.
   - It is not used in the lesson, so there is no learner impact yet.
