# French 101 Core 1–3 draft checkpoint

This is a French-target, English-support **authored draft**, not a released course. The branch is stacked on draft PR #241. Stable intended IDs are `french-basics` for Core and lesson numbers 1–3. No existing Spanish or French learner progress was edited.

The source anchor is `src/data/spanish-basics-core.json` plus the Core 1–3 reading entries in `src/data/spanish-basics-practice.json`, pinned by SHA-256 in `source-english-core-1-3.json`. Claude Haiku via the authenticated CLI drafted the French text with a USD 1.50 per-call cap. A local editorial pass restored the exact source objective field, retained *espagnol* in two phrases whose English source explicitly says Spanish, and made the no-recording status explicit. This draft has **no independent Fable/Opus or qualified human language review**.

`scripts/validate-french-basics-core-draft.py` passes: three lessons, 42 exact English vocabulary/phrase meanings, 18 exact aligned English Reader meanings, source file hashes, dialogue/check structure, and `reviewed:false`. Foundation's existing validator also passes. The validator does not judge French fluency, teaching progression or release readiness.

Open: independent Fable fidelity and Opus curriculum review with material corrections; qualified French review; Core 4–30 and Master 1–20; runtime, six-mode, Reader, card, dictionary, speaking, offline and progress verification; recorded French audio; phone and native-app acceptance. The English source's broad preposition/pronoun glosses need contextual language review.
