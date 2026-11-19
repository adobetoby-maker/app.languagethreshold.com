# Read-only review: Foundation 7 and 8 (fr-en)

These are proposals only: nothing was edited and nothing here is a qualified approval. I reviewed the pasted candidates and did not open the source packets, so anchors and hashes are unverified.

## Held rows
All held rows in both lessons are clean: `candidateFrench`, `selectedFrench` and `audioScript` are null, and the dictionary rows are `held` with a null sense. No activity, form or speaking field draws on a held row.

One thing to keep an eye on in Foundation 8: the type and write activities, the word bank and the grammar note use "yet / pas encore" via non-held card 10 and line 1. That is legitimate, but it sits next to held card 7 ("still, yet"), so do not cite card 7 as an anchor.

## Foundation 7: material

1. **Speaking closure contradicts the partner role.** The partner supplies no ladder location or reason, yet the closure is "Thank you, that answers my questions." Propose "Thank you." or let the partner answer with authored lines labelled as new.
2. **Internal status in learner-facing fields.** The objective ends "role/material questions remain held", and `partnerRole` says "no invented … is supplied". Propose moving both to `internalNotes`; the objective becomes "Ask location and reason questions in English and recognize question words."
3. **Unresolved French register.** "Pourquoi on s'arrête (à onze heures) ?" is colloquial (*on*, no *est-ce que*), next to standard "Où est l'échelle ?". This on/nous and question-form choice is not recorded as a pending decision the way tu/vous is. A neutral option for qualified French review is "Pourquoi est-ce qu'on s'arrête… ?"; at minimum, add a note.
4. **Write activity anchor.** `card:12` is "Why are we stopping?" without "at eleven"; only `line:7` is the exact source. Propose marking `card:12` as supporting or dropping it.
5. **Speaking over-anchored.** `card:2` (who) is listed but not used in the opening, goal or word bank. Propose removing it.

## Foundation 7: minor
- **Prompt wording:** "son association française" is unidiomatic; propose "son équivalent français". "La phrase anglaise pour « … »" is a calque; propose "qui signifie", as the other prompts have.
- **Accepted variants before scoring:** "Where's the ladder?", "Why do we stop at eleven?", "eleven o'clock".
- **Hold consistency:** "how → comment" is an unheld candidate, though it is context-free in the same way as held "what" and "which" (how + adjective, how much). Hold it or note why it differs.
- **Grammar note:** it is accurate, but it is English metalanguage ("progressive", "subject") for foundation learners. A French-support version is needed before runtime.
- **Provenance:** labels are correct. "Who is there?" and "Excuse me," are new; the ladder and stopping sentences are exact source.

## Foundation 8: material

1. **"nobody" gloss is inconsistent and malformed.**
   - The hear activity expects "aucune personne", but the natural learner answer is "personne". Propose expecting "personne" and accepting "aucune personne".
   - The form, candidate row and dictionary use "personne, au sens de aucune personne". This is a gloss, not a selectable string, and it has an elision error. Propose sense "personne" with a separate note "(pronom négatif : « aucune personne »)".
2. **Speaking task is incoherent.**
   - The goal is three unrelated statements, and the partner "listens and responds" with nothing defined.
   - "I don't understand" is left unresolved before "Thank you." The natural follow-up is held line 7.
   - Propose dropping non-understanding from the speaking goal; it stays in the say activity.
   - Propose a newly authored partner cue, labelled as new, such as "Is the roof ready?" answered by "Not yet. The roof isn't ready yet."
3. **Goal, word bank and anchors do not match.**
   - The objective names "absence", and the word bank has "nothing", but the goal has no absence sentence.
   - `card:2` (nobody) is anchored and never used.
   - Propose either adding "say there's nothing in the wheelbarrow" to the goal, or dropping "nothing", `card:3` and `line:4`. Drop `card:2` in both cases.
4. **Internal status in the objective.** "Harness and material quantities remain held" should move to `internalNotes`. Suggested objective: "Say that something isn't ready yet, that you don't understand, and that something or someone is absent."
5. **Unheld safety assertion.** "We never work on a wet roof" is an exact source sentence, used in the form, the grammar note and the speaking goal. It is a safety-practice claim, while the harness rows are held for trade review. Propose an explicit trade-review note, or a hold if the same standard applies.
6. **Same register issue as Foundation 7.** "On ne travaille jamais…" uses *on*; record the pending on/nous decision.

## Foundation 8: minor
- **Grammar note:** it is accurate and well aimed at French speakers. It names "nobody" but gives no example; "Nobody is on the roof." could be added, labelled as new. It also does not cover *don't* + verb, which the say activity uses.
- **Prompt wording:** the same "association française" and "pour" fixes apply.
- **Accepted variants before scoring:** "The roof is not ready yet", "is not yet ready", "I do not understand."
- **Provenance:** labels are correct. "Nobody is on the roof." and "Thank you." are new; the wet-roof, wheelbarrow and roof-not-ready sentences are exact source.

Source-grounded corrections applied to closure/partner coherence, internal status placement, exact/supporting anchors, negative-pronoun sense separation, matched speaking goals/wordbanks, French grammar support and candidate register/trade notes. All selections and approval gates remain false.
