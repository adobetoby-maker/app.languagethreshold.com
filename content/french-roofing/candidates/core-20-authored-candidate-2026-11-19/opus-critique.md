# Shared batch read-only critique

# Review: core-roofing 19–21 (fr-en inert supplements)

This review covers only the pasted JSON. I did not check the packets, the hashes or the source files. These are correction proposals only; nothing here is an approval.

## Cross-lesson findings

1. **Provenance names a French field that isn't in the JSON.** Lessons 19 and 20 cite `conditionalFrench`, and lesson 21 cites `candidateFrenchProposals`. The rows themselves only contain `candidateFrench`. Either cite the actual packet field or say "candidateRows[…].candidateFrench". As written, the activity provenance can't be traced to the row it quotes.
2. **The French scaffolds for the forms ignore gender.**
   - 19 form:1 uses "Ceci est le + nom", and 19 form:2 and 21 form:2 use "Est-ce le + nom ?". 21 form:2's own example is *la boucle*, so its scaffold doesn't fit its example.
   - 21 form:1 uses "C'est un + nom", and 21 form:3 uses "Où est le + nom ?".
   - Proposal: use **le/la/l'** and **un/une** everywhere, as 19 form:3 and 20 forms 1–2 already do.
3. **Register is inconsistent.** 19 uses "Ceci est le mur." in hear and form:1, while 20 and 21 use "C'est…". Proposal: use **"C'est le mur."** throughout.
4. **No lesson explains a vs the.** Lessons 20 and 21 mix "This is a" and "This is the", but neither grammar text says when to use which. Add one learner-facing line, for example "a = un/une, first mention or any one; the = le/la, a specific known item".
5. **Deixis doesn't match the picture setup (20, 21).** The partner holds up picture A, then asks "What is in picture B?", and the learner answers "This is the…" about a picture that isn't being shown.
   - Option 1: the partner holds up B ("Yes. [shows B] What is this?").
   - Option 2: the expected answer becomes "The ridge." / "The buckle."
6. **Guillemets are used unevenly in prompts.** 19 say and 21 write leave out « » around the French sentence; the other prompts use them.

## core-roofing:19 (wall)

- **The speaking task doesn't make sense.** The partner holds up picture A, and the learner asks "Is this the wall?" and gets "Yes." The learner then asks "Where is the wall?" about the picture already confirmed in hand, which makes the goal ("identify… and ask where it is") contradict itself.
  - Proposal: the partner holds up B. The turns become: "Is this the wall?", then "No.", then "Where is the wall?", then "The wall is in picture A."
  - The partner then never needs to say *roof*, which has no anchor in this lesson (it appears only in the context and in reader:2).
- **Untaught form in the word bank.** "How do you spell wall?" is an expected learner turn but isn't in the grammar or forms. Either add it as form:4 or replace the spelling exchange with a repeat cue only.
- **Recall and type are the same item.** Both ask for "le mur" → "wall". Proposal: make type **"the wall"**, or change recall to a see/recognition item.
- **Recall provenance is incomplete.** It says "Exact source English headword" but doesn't label the prompt as new composition the way the other activities do.
- **Source discrepancy not recorded.** Card 13 and the source speaking say *Describe*, but reader 3 says *Explain*. The reader:3 hold reuses the card-10 text and doesn't note this. Record it as review evidence; don't resolve it.

## core-roofing:20 (ridge / cut / finish / nail)

- **The noun sense of *finish* is a new selection, not a source sense.** Both source sentences use *finish* as a verb (card 14 and reader 8, "when you finish"). Card 7 also sits beside *cut* (a verb) in the term list. Calling it "finish is the noun here" with *la finition*, and the hear provenance saying the support "retains noun sense", presents a candidate choice as if it came from the source.
  - Proposal: label it **"new: noun sense selected for this supplement; source card:7 sense (noun vs verb) pending qualified review"**.
  - Better still, hold *finish* until that review and drop it from hear, write and speaking.
- **The write activity doesn't teach the meaning of *finish*.** The prompt "L'étiquette indique finish." contains the English answer word, and its expected meaning repeats the prompt. It tests the unanchored new word *label*, not *finish*.
  - *Label* can also be read as a product label, which drifts toward the held product/finish detail.
  - If *finish* is kept, quote the word in the prompt (« finish ») and mark *label* as new vocabulary. If *finish* is held, replace the item with a nail or ridge sentence.
- **Card versus label.** The practice context says "card C the printed noun finish", but the partner says "label C". Use one term.
- **Objective and activity don't match for *cut*.** The objective says *recognise* cut, but recall asks the learner to produce it.
  - The prompt "le mot anglais de base" is vague. Proposal: **"Donnez le verbe anglais (forme de base) pour « couper »."**
  - The "not a command" note is correct and should stay, given the held card 10.
- **Missing field.** Forms 1–3 lack `frenchSupportProvenance`; lessons 19 and 21 include it.

## core-roofing:21 (harness / buckle / hard hat / fall protection)

- **Leak through the word bank.** The speaking word bank includes *fall protection*, but no turn uses it. In a picture-naming game it invites "This is fall protection." about the harness picture. That is effectively the held claim in card 14 and reader 2 (a harness as the protection or access condition).
  - Proposal: **remove "fall protection" from the speaking word bank**. Keep it as the noun-only type item.
- **A partner cue doesn't fit the answer.** "Where would you like to look next?" isn't answered by "Where is the hard hat?". Proposal: "Yes. What else?", or have the partner prompt with "Ask about picture C."
- **Some hold reasons are on the wrong rows.**
  - The *ancla/anclaje* note is on card 8 (fall hazard) and card 10. Card 3 (roof anchor), card 12 and reader 5 (approved anchor) only carry the generic boilerplate. Move or copy the anchor note onto those rows.
  - Card 2 (tie-off) carries the generic hold. It should carry the tie-off, anchor and access-sequence hold that cards 9, 4 and 6 have.
  - Card 13 and reader 7 ("Put on your hard hat too.") are safety commands, but their only hold reason is the product/substrate boilerplate. State plainly that they are safety commands not selected pending qualified review.
- **The ladder and triage content stays out of learner text, which is correct.** Reader 1 (ladder) and reader 6 ("don't go up and tell me") remain held and don't appear in any activity. Keep it that way.
- **Locale review for *le casque de chantier*.** It may vary by locale (e.g. *casque de sécurité*). The existing `qualifiedSenseReviewPending` covers this; just note it for the French reviewer.

## No material issue found

- The `heldDecisionRefs` lists match the non-candidate rows in each lesson.
- Apart from the 21 word-bank item, no held term or sentence appears in learner text.
- All gates are false and every `selectedFrench` and `audioScript` is null.
- Source objectives and source speaking are kept as incomplete provenance.
