# Verb pattern practice series (no AI at runtime)

Owner (2026-10-22): "should we not build out parts for them, and just upload them? I would like the patterns practice to use more multiple choice, then recall like matching, then cards, and listening etc. It should have a mini game series for each pattern to practice, with the typing the last one, i.e. have you mastered it."

## What
For every verb family on the Verbs ladder (regular -ar/-er/-ir, -go, e→ie, o→ue, e→i), a 5-step series built ONLY from the signed verb data (src/data/verb-patterns/es.json via the existing loader). No AI calls.

| Step | Game | Mechanic | Pass |
|---|---|---|---|
| 1 | Pick it | prompt "yo ___ · I come · venir" → 4 choices (correct + distractors from src/lib/verb-games/distractors.ts, never a valid alternative) | 8 of 10 |
| 2 | Match it | 5 forms ↔ 5 person+English pairs, tap-to-pair | all pairs, ≤2 mistakes |
| 3 | Cards | flip card (front: infinitive + person + English; back: form + example), self-rate Again/Good/Easy; due ones repeat in-session | each card rated Good/Easy once |
| 4 | Listen | play the form (existing TTS, current voice), pick from 4 | 8 of 10 |
| 5 | Type it (mastery) | prompt shown, type the form; accent-tolerant check offers "almost — mind the accent" but only exact counts | 8 of 10 exact |

- Each step unlocks the next; steps stay replayable. Passing step 5 marks the family "Mastered" on the ladder tile (device store, existing mastery shape extended with per-step progress).
- Item pool per session: the family's verbs from the learner's source pool (sourceFilterFor), 10 items, persons spread, seeded RNG (rng.ts).
- Misses show the family's rule line (from families.ts/rules) and the right form with English.
- Ladder tiles open the series (route verbs=unit&vfamily=<id>, replacing the current picker redirect in practiceScreen()); recap "Practice this family" goes there too.
- Accessibility: keyboard for every step (1–4 keys for choices, Enter to submit), screen-reader labels, reduced motion, ≥44px targets, focus ring ink/gold.
- Design: same look as See/Hear/Write/Type/Speak steps (lesson step bar style), no emoji, no purple, no outer glow.

## Not in scope
Pattern Lab / Conjugation question banks (separate spec). Leaderboards. Server sync.
