---
name: language-core-builder
description: Map and build a complete Language Threshold language core from the Spanish 101 pattern for a new exact target/native pair. Use for requests to add a new general language course, compare coverage, or reuse the 10/30/20 course template.
---

# Language Core Builder

Find the current `app.languagethreshold.com` source checkout and read `AGENTS.md`. Inspect `docs/language-core-builder.md` for the Spanish 101 baseline, the Japanese mirror map, and the exact source entry points. If the document is absent in that checkout, retrieve it from the app repository or reconstruct the map from the three Spanish 101 curriculum sources; never treat an old snapshot as current production.

Treat the course as an **exact target/native pair**. A language selector, scattered vocabulary, or AI fallback is not a course. Run the read-only `add-language-threshold-module/scripts/audit-module.mjs` for the Spanish baseline and requested pair; use that skill's implementation map when wiring lessons. Record the source revision, stage counts, review state, and deployment state separately.

Mirror the **learning architecture**, not Spanish words or grammar: 10 Foundation, 30 Core, 20 Master; stable stage-local lesson IDs; See, Recall, Hear, Type, Say, Write; lesson-specific Reader passage, cards, speaking mission, dictionary links, reviews, and account-scoped progress. Map concepts first, then author natural target-language content with English or the requested native language as support. Include the script, pronunciation, register, morphology, segmentation, and typography decisions that the new language needs. For Japanese, start from the proposed map in the repo document, then validate it with fluent Japanese review before claiming it is approved.

Keep one authored source and derive app assets reproducibly. Preserve existing learner progress and published lesson identities. Do not make a catalog card or generated placeholder look like a completed course. Distinguish `planned`, `authored draft`, `mapped draft`, `human reviewed`, and `released` in the coverage ledger.

Before a release claim, rerun the exact-pair audit and test representative start/end lessons in every stage, six modes, Reader, cards, speaking, progress isolation, narrow-phone script fit, and offline behavior only if downloads are offered. Report what is still missing, including human review and physical-device audio checks. A source audit and local tests do not prove production readiness.
