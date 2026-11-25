# French Roofing Core11 legacy-reference repair

Baseline: exact main `41550e1dfc45bc0abc781b79969d73dd527a1962` (#813). This deterministic provenance-only repair corrects22 copied `roofing:7:*` references to owning `roofing:11:*` references:13 cards and9 Reader turns. No runtime identity, source content or saved progress is changed.

The generator read lesson n11 and passage section11 but hardcoded7 in the output references. It now finds curriculum lesson n11 by identity, separately imports `ROOFING_LESSON_WORDS[11]`, asserts the curriculum words equal that owning section and derives refs from the validated lesson number. Every card Spanish/English/kind triple and every ordered Reader Spanish/English pair is checked against section11. This avoids a blind string replacement.

Former erroneous refs remain on every row in `legacySourceRefHistory` and in the [unregistered provenance crosswalk](../../content/french-roofing/review/core-11-source-decision-2026-11-18/legacy-reference-crosswalk-2026-11-25.json). The crosswalk records exact row content hashes, positions, owning paths/section and pair-scoped IDs. Packet hashes:

- Previous: `8a1c5c95521ee21d88eccf3ace87b64f5af75703325e634ebf0525eb8d034374`
- Repaired: `ebffc8bcd7da1871e8ad1b02bd3eb69452da8ac216f410e86076f9254af91c7a`

Only the dependent Core11 candidate packet pin and additive repair evidence changed. Source-file hashes and ordered source-content hash are unchanged. Independent validation restores previous refs, removes only additive repair provenance and compares the source packet/candidate with the exact baseline. All English/French text, IDs, row order, safety/meaning holds, activities, forms, dictionary senses, speaking drafts, original scope and false gates match. Core7 and the previously repaired Core8 packet are unchanged.

Checks passed:

```sh
python3 content/french-roofing/review/core-11-source-decision-2026-11-18/build.py --check
python3 content/french-roofing/review/core-11-source-decision-2026-11-18/validate.py
python3 content/french-roofing/candidates/core-11-authored-candidate-2026-11-19/validate.py
python3 scripts/validate-french-roofing-core11-reference-repair.py
```

Core11/Core7 active collisions fell from22 to0. The post-repair scan resolves all30 Core packet paths from their candidate pins, including Core21's separate safety-decision directory: all691 active legacy refs now match their section/position, with zero namespace mismatches or duplicates. All60 downstream candidate hashes,240 underlying source pins and60 candidate validators passed. Core8's builder check and independent repair validator also passed. [Machine-readable results](roofing-core11-legacy-reference-repair-2026-11-25.json) record these counts.

No new AI call or qualified-review claim occurred. The crosswalk is unreviewed source provenance, not an approved saved-item or progress migration. Mapping/import approval remains false, all learner/scoring/audio/listening/offline/progress/V4 gates remain false, and selected French/audio remain null. Linguistic, product, safety and original-objective decisions remain unresolved.

Next substantive bounded work: Core10–12 contextual speaking/French-support reconciliation, preserving the corrected identities and exact source/teaching arrays.
