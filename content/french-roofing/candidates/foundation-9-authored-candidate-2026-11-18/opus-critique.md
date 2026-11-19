# Correction proposals: Foundation 9 and 10 (fr-en)

These are read-only proposals. I made no edits and give no approval. Every gate stays false.

## foundation-roofing:9:fr-en

**1. Held-row leakage through the "excuse me" sense (material)**
- **Where:** `speaking.candidateOpeningEnglish` ("Excuse me, can you pass me the hammer, please?") and `grammarExplanationEnglish` ("before you pass someone **or interrupt**").
- **Problem:** Card3 is scoped to "excuse me (to pass)". Using it to get attention or interrupt is the sense held in card4 ("sorry, excuse me").
- **Proposal:** Change the opening to the exact line2, "Can you pass me the hammer, please?". In the grammar text, keep only "Use 'Excuse me' when you need to pass someone."

**2. Role mismatch in the speaking goal (material)**
- **Where:** `goalEnglish` says "thank the **crew member**".
- **Problem:** The learner is the crew member and the partner is the coworker.
- **Ordering conflict:** The goal ends with "give one short instruction", but `closureEnglish` is "Thank you." This contradicts the closure provenance ("an instruction is not a closing").
- **Proposal:** "Ask politely for a tool, give one short instruction, and thank your coworker."

**3. Internal note in a learner-facing field**
- **Where:** `partnerRole` contains "no ladder setup method is supplied".
- **Problem:** That is a provenance or safety note, not role text.
- **Proposal:** Change `partnerRole` to "A coworker who hands over the hammer." and move the ladder note to `internalNotes`.

**4. Missing provenance on forms and speaking anchors**
- **Forms:** Unlike lesson 10, the forms have no `provenance` field.
  - Form2 `englishForm` "Wait here." is not an exact source row. It needs card8 as an anchor and the label "new combination of card6 + card8; full sentence exact in card11/line5".
  - Form1 and form3 should be labelled "exact line2" and "exact line4".
- **Speaking anchors:** `speaking.sourceAnchors` omits card1 (please) and card8 (here), though the opening and word bank use both.

**5. Forms are whole sentences, not forms (moderate)**
- **Problem:** The `englishForm` values repeat full sentences, while the grammar text teaches two patterns.
- **Proposal:**
  - "Can you + base verb?"
  - "Imperative: base verb (+ here / object)"
  - Keep the current sentences as `candidateExampleEnglish`.

**6. Answer alignment risk on the say activity (low; matters once scoring is on)**
- **Problem:** The prompt "Faites attention." can also produce "Careful" or "Watch out", which belong to held card5.
- **Proposal:** Record that only "Be careful." (card10) is the target, and that card5 faces must not be accepted until card5 is resolved.

**7. French grammar text is out of step with the English**
- **Problems:**
  - "verbe sans sujet" leaves out the base-form point.
  - "Please ajoute la politesse" drops the guidance on where *please* goes.
- **Proposal:** "Utilisez *Can you* + verbe à la forme de base pour une demande polie. Ajoutez *please* à la fin. Pour une consigne courte, mettez le verbe en premier, sans sujet : *Wait here, please.*"

**8. card3 and line1 French differ**
- **Where:** Card3 gives "excusez-moi", but line1 renders the same to-pass sense as "Pardon".
- **Problem:** "Pardon" also appears in card4's held archived answer.
- **Proposal:** Note the divergence for the qualified French reviewer. Don't harmonize it yet.

## foundation-roofing:10:fr-en

**1. Held-row leakage via "the word X" (material)**
- **Where:** The write activity, form2 and the speaking goal all use "What does **the word** inspection mean?".
- **Problem:** Card9 is "What does … mean?". The "the word X" frame comes from held reader7 ("What does the word caída mean?"), even though the derivation note says otherwise.
- **Proposal:** Use "What does inspection mean?" throughout. That matches card9 and `grammarExplanationEnglish`, which already uses this form.
  - Write prompt: « Écrivez en anglais : « Que veut dire *inspection* ? » »
  - Update form2 and the speaking text to match.

**2. Form1 "goes" doesn't fit the lesson (material)**
- **Problems:**
  - Neither the objective nor either grammar text covers third-person *-s*.
  - Line6 is the follow-on to held reader5 (the serious-injury/911/ambulance branch), so it pulls the held emergency scene into the lesson.
- **Proposal:** Replace form1 with card12:
  - `englishForm` "do + you + base verb"
  - example "Do you speak English?" (exact card12)
  - Card12 is already explained in the grammar text but not used anywhere else.

**3. The speaking exchange is tautological, and "I need help" is ambiguous**
- **Tautology:** `partnerCueFrench` "Inspection signifie inspection en français dans ce contexte." teaches nothing, and "dans ce contexte" refers to a context that isn't defined.
- **Ambiguity:** "I need help." as an opener on a roofing scene can read as an injury call. The internal note says no triage decision is intended.
- **Proposal:**
  - Make the language-help frame explicit in `goalEnglish`: "Ask a coworker for help with an English word…".
  - Change the cue to: « *Inspection* veut dire « inspection » : on vérifie le travail. »
  - Label the cue as new composition. It describes a general sense, not a technical finding.

**4. Speaker gender is handled inconsistently**
- **Where:** Reader3 "Un collègue a un petit accident…" assigns masculine gender to "A coworker".
- **Problem:** The same packet set holds card4 and line3 for exactly this kind of désolé/désolée assumption.
- **Proposal:** Add a matching hold, or note an epicene alternative (e.g. « Une personne de l'équipe… ») for the qualified reviewer.

**5. Type activity accepts more than one answer**
- **Where:** « l'urgence » can also mean "urgency", and « les urgences » means the ER.
- **Proposal:** Document "the emergency" as the only card1 target and list "urgency" as a known non-target for when scoring is enabled.

**6. Grammar text needs cleanup**
- **English:** Learner text without quotes reads as run-on, e.g. "I need help uses need with…".
- **Proposal:** Put quotes around the examples, and cover the do/does + base verb point once for both "What does … mean?" and "Do you speak English?".
- **French:**
  - Mixes a curly apostrophe (J’ai) with straight ones elsewhere.
  - Omits "Do you speak English?".
- **Proposal:** Align the French text with the English in content and typography.

**7. Register (low)**
- **Where:** Card12 « Vous parlez anglais ? » uses intonation-question vous, while lesson 9 uses imperative vous.
- **Proposal:** Defer to the course-level register decision already noted in lesson 9. Add the same note to lesson 10's `internalNotes`.

**8. Closure provenance**
- **Where:** "Thank you." is labelled "new … not a quote from this source packet".
- **Proposal:** Change the label to "reuses Foundation 9 card2; not in this packet" so the cross-lesson dependency can be traced.

## No issues found
- The recall activity's change from "the safety" to "safety" is correctly labelled.
- Lesson 9's type activity "Come here." is correctly labelled as a new composition.
- In both lessons, held rows (lesson 9: card4, card5, line3, line6; lesson 10: card11, line2, line5, line7) have null selections and are not directly targeted.
- Every gate is false, and every audio-required item is marked unrecorded.

Source-grounded corrections applied to request sense/role, provenance, form patterns, grammar support and language-help context. New word-meaning question simplified to the exact source template. Neutral crew-person candidate restores gender-neutral source. Qualified review remains open.
