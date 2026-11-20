# Shared batch read-only critique

# Review: core-roofing 16–18 (fr-en), pasted JSON only

These are read-only correction proposals. Nothing here approves anything. I did not open the packets or check the hashes, so source fidelity is judged only against the `candidateRows` and holds in the paste.

## core-roofing:16 (nail)

**16-1. Objective, goal and turns don't match.**
- The objective says "ask for its name", but no turn asks for a name. "Is this a nail?" is identification.
- `goalEnglish` leaves out the polite request, yet the turn sequence ends with "Please show me the nail."
- Proposal: change the objective to "Identify the word nail, ask how to spell it, repeat it and make a polite request." Make `goalEnglish` match.

**16-2. The final turn doesn't make sense in the scene.**
- The partner is already showing a card with a single nail, so asking "Please show me the nail." at the end is redundant.
- It also echoes the excluded held line "Show me where the strip is."
- Proposal: move the request to the opening ("Please show me the nail." → partner shows card → "Is this a nail?" → "Yes." …). Alternatively, label it in learner-facing text as a pattern drill, not dialogue.

**16-3. The internal note's held list contradicts `heldDecisionRefs`.**
- The note's list of held cards ("Held cards 1, 3, 5–9, 10–15") leaves out card 2 (high nail).
- Its list of held readers ("held readers 1, 2, 4–7") leaves out readers 3 and 8.
- `heldDecisionRefs` lists every card except card 4, and all readers 1–8.
- Proposal: change the note to "all cards except card 4; readers 1–8."

## core-roofing:17 (manufacturer instructions / wrapper)

**17-1. Held content leaks through "number of nails".**
- The objective says "the number of nails for a hypothetical product wrapper", and `goalEnglish` says "ask for the number of nails in them".
- Together with the turn "What information do you need?" → "I need the number of nails.", this rebuilds the held objective (confirm the manufacturer's fastener count). It also mirrors held card 12 ("How many nails does this shingle need?") and card 15 ("I need the exact pattern for this product.").
- Proposal:
  - Limit the objective to naming and locating items.
  - Add card D "number of nails" to the practice context, with the cue "What does card D say?" → "Number of nails."
  - If form 3 stays, give it a neutral example that doesn't request a count, such as "I need the manufacturer instructions."

**17-2. Goal and turns are misaligned.**
- The goal says "ask for the number of nails", but the learner never asks a question about it.
- `practiceContextEnglish` lists only cards A–C, yet the learner says "number of nails".
- The word bank includes "nail", which no activity in this lesson teaches.
- Proposal: fixing 17-1 resolves the first two points. Either drop "nail" from the word bank or add an activity for it.

**17-3. The write activity's anchors are wrong.**
- "Where are the manufacturer instructions?" claims it is "composed from … card 3 and card 8".
- "product" (card 8) does not appear in the sentence.
- Proposal: anchor it to card 3 only and correct the provenance text.

**17-4. The French support is inconsistent.**
- Form 2 renders "Where are the …?" as « Où sont les… ? ».
- The write activity renders it as « Où se trouvent… ? ».
- Proposal: use one rendering in both places. « Où sont… ? » matches the form as taught.

**17-5. The internal note's held list is incomplete again.**
- The note's held list ("Held cards 1, 2, 10, 14 and held readers 2, 3, 8") leaves out cards 5, 6, 11, 12 and 15, and readers 1, 5, 6 and 7.
- All of these appear in `heldDecisionRefs`.
- Proposal: correct the list.

**17-6. Two nearly identical source lines have different hold status (flagged only, no triage proposed).**
- Card 13 "Read the wrapper." is a candidate with French support.
- Reader 5 "Read the wrapper on the package." is held under the generic propagation reason.
- Neither is used in this lesson, but a reviewer should reconcile the two decisions.

## core-roofing:18 (air pressure / compressor / depth / nail head)

**18-1. The roles and setting contradict the scenario.**
- `learnerRole`/`partnerRole` are "Worker"/"Colleague" with a "labelled diagram".
- The practice context and `scenarioProvenance` describe a word-card exchange with no site.
- "Worker" implies a job-site role that the scenario avoids.
- Proposal: use "A learner reading word cards" and "A partner presenting word cards", as in lessons 16 and 17. Pick either word cards or a diagram and use it everywhere.

**18-2. "What is the depth?" risks leaking held content.**
- In a lesson titled "Avoid Overdriven Nails", the partner's cue "What dimension do you want to ask about?" leads the learner to ask for a depth. That is the held fastening-depth specification (cards 10 and 13).
- No answer is shown, so the exchange invites an unstated specification.
- Proposal: make it an identification turn ("What does card D say?" → "Depth."). Alternatively, give the depth question a non-roofing object in learner-facing text, labelled as new composition.

**18-3. The write activity uses an untaught structure and implies a held relationship.**
- "Which part is the compressor?" uses a structure none of the forms teach.
- "Part" frames the compressor as a component of something, most likely the held nail gun system.
- The French « Quelle partie est le compresseur ? » is unnatural.
- Proposal: use "Is this the compressor?" / « Est-ce le compresseur ? », which matches form 2.

**18-4. Form 1's French template is gender-locked.**
- « Quelle est la + dimension ? » only works for feminine nouns.
- Proposal: « Quel/Quelle est le/la + nom ? ».

**18-5. The internal note's held readers list ("held readers 2–9") leaves out reader 1**, which appears in `heldDecisionRefs`.

**18-6. Minor dictionary point (for review only).**
- For a generic headword, « la tête de clou » is the more usual dictionary sense.
- « la tête du clou » refers to one particular nail.
- Leave the choice to qualified French review.

## Cross-cutting

**X-1. French provenance labels are inconsistent.**
- In lessons 17 and 18, the see, recall, type and say activities label French as "new composition".
- The same French already exists as card `candidateFrench`, and the hear activities and lesson 16 call it "candidate French sense".
- Proposal: label French that comes from a card as candidate support. Use "new composition" only for English or French that is actually new.

**X-2. Held framing may reach learners through the dictionary.**
- Candidate dictionary entries carry the held-lesson framing in `contextEnglish` ("Nailing Zone", "Fastener Pattern", "Avoid Overdriven Nails").
- If that field is ever shown to learners, the held domain framing travels with generic terms like nail, product and depth.
- Proposal: confirm whether the field is internal-only, or use a neutral context for non-held entries.

**X-3. Several `hold` strings start with a leading space** (" Linked unresolved…"). This is data hygiene only.

**X-4. Hear activities are correctly blocked.** They are `audioRequired: true` with no script, which matches the gates. No change needed.
