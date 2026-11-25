# French Roofing Core8 legacy-source-reference repair

Baseline: exact main `a940582fa4eba0f3c14c1251dbcd9a4b705de102` (#811). This deterministic provenance-only repair changes23 Core8 references from the copied `roofing:7:*` namespace to the owning `roofing:8:*` namespace. It changes no runtime identity or saved progress.

The generator previously read curriculum lesson n8 and passage section8, but hardcoded7 when writing references. It now finds the curriculum lesson by asserted `n === 8`, independently imports `ROOFING_LESSON_WORDS[8]`, requires curriculum words to equal that owning section, and derives references from the asserted lesson number. All15 card Spanish/English/kind triples and all8 ordered Reader Spanish/English pairs were checked against section8 before generating references. This is row-content verification, not a blind replacement.

Every repaired row retains its former erroneous reference in `legacySourceRefHistory`. The source-only [crosswalk](../../content/french-roofing/review/core-8-source-decision-2026-11-18/legacy-reference-crosswalk-2026-11-24.json) records old/new references, proposed pair-scoped row IDs, owning path/section/position and exact Spanish/English content hashes. The former packet hash is retained as provenance:

- Before: `0851a4b353853ac15174c38890cf5ca651c69096eeda9b7f660088b0b1527337`
- Repaired: `0665ba8a5ab12068ff1c8bf800785c2c75eeb50ca1e79107558bd572de8bcb90`

Only the dependent Core8 candidate review-packet hash and additive repair evidence changed. Existing speaking notes and AI critiques describing the former collision remain historical evidence. Its active source reference repair metadata points to the new crosswalk. Source-file hashes and ordered source-content hash remain unchanged.

The independent validator restores every former reference, removes only additive repair evidence and compares both source packet and dependent candidate to the exact Git baseline. All authored English/French, proposed IDs, row order, source/meaning/safety holds, activities, forms, dictionary senses, speaking revisions, earlier drafts, source-file pins, original objectives and gate values match. Core7 is unchanged. Active Core8/Core7 reference collisions fell from23 to0.

Validation passed:

```sh
python3 content/french-roofing/review/core-8-source-decision-2026-11-18/build.py --check
python3 content/french-roofing/review/core-8-source-decision-2026-11-18/validate.py
python3 content/french-roofing/candidates/core-8-authored-candidate-2026-11-19/validate.py
python3 scripts/validate-french-roofing-core8-reference-repair.py
```

All60 current candidate review hashes,240 underlying source pins and60 per-candidate validators also passed. [Machine-readable checkpoint](roofing-core8-legacy-reference-repair-2026-11-24.json) records counts and hashes.

No new AI call or qualified-review claim occurred. The crosswalk is unreviewed, unregistered historical provenance; saved-item mapping and progress import explicitly remain unapproved. All existing learner, scoring, audio/listening, offline, saved-item/progress and V4 gates remain false; selected French/audio remain null. No source linguistic or specialist hold was resolved.

A read-only scan of the remaining Core packets found one other copied namespace: Core11 has22 references using `roofing:7:*` instead of its section11 namespace. Those packets were left unchanged. The next bounded identity repair should match Core11 row content to owning section11 before changing references and downstream hashes; no saved-item/progress mapping is established by either repair.
