# Master 15: five-form and seven-form reference reconciliation

This reference-only sidecar compares the two existing proposals without copying a new lesson packet or selecting either inventory. All prior cards, Reader turns, forms, mode cues, speaking objectives, word banks, source pins, IDs and order remain unchanged. All source/domain/Japanese/dictionary, learner, scoring, audio/listening, offline, progress, browser and V4 gates stay false; selections and audio are null.

## What actually differs

The five-form proposal and seven-form proposal share **five byte-identical English/Japanese faces**. Their labels and grammar explanations differ and remain independently referenced by JSON pointer and text hash:

| Exact source reference | Five-form proposal | Seven-form proposal |
|---|---:|---:|
| Card 17 | Form 1 | Form 1 |
| Card 19 | Form 2 | Form 2 |
| Card 20 | Form 3 | Form 3 |
| Card 21 | Form 4 | Form 4 |
| Card 23 | Form 5 | Form 6 |
| Card 22 | Absent | Form 5 |
| Reader 18 | Absent | Form 7 |

Thus “five versus seven” is an inventory/explanation choice, not five conflicting translated answer faces. The seven-form proposal adds a location-report face and the final arrival/inspection narrative. That does not establish that its coverage or explanations are complete or qualified. In particular, the ten-minute arrival is source narrative, not a response-time promise. No valve, flame, switch, evacuation or waiting procedure is approved by comparing these forms.

## Pinned 911 / legacy 119 evidence

The pinned San José source has `911` / `el 911` at Card 10, and Reader 12 says Alex dials 911. Both reconciled Japanese faces say `911番`. This is a report of the pinned source, not a new emergency-number instruction or a claim about another locale.

The older Japanese draft instead has 119 at **legacy Card 23** and **legacy Reader 11**. The existing exact-English crosswalk marks both unmatched. The legacy Card 23 is not the reconciled Card 23, which identifies the red T-shirt at the entrance; the legacy Reader 11 is not the source’s 911 Reader 12. Same-index reuse would change meaning, so no saved-item, score, progress position or old exact-text recording is selected for transfer.

## Atomic mapping and remaining decisions

All six existing modes have source references and false readiness. None directly targets the 911 Card 10. The Hear item targets the gas-leak noun; Type targets the possible-leak report. Possible versus confirmed leak remains distinct in the existing forms and arrival narrative. Both speaking proposals and both word banks already use the pinned 911 wording. Source dictionary references identify the gas-leak noun (Card 2) and 911 (Card 10); no new runtime dictionary entry is authored.

Qualified Japanese/source/domain review still needs to choose or revise explanation variants, decide whether the two additional form faces belong in the lesson, and validate source-specific procedural and locale wording. Any later choice must map forms with exact cards/Reader, modes, speaking, dictionary, word bank, saved-item identity and audio scope together. A stable lesson ID alone does not establish row equivalence or preserve an old score.

This comparison uses deterministic source/ref/hash checks only: zero new model calls and no semantic reauthoring. Existing model provenance stays with the prior proposals; no new AI or qualified approval is claimed.

Run `python3 content/japanese-travel-lunch/review/master-13-20/validate-master15-form-source-reconciliation.py`. It checks ten pinned source/prior files, seven source groups, twelve original form pointers, five shared exact faces, two additional references, 911/119 unmatched evidence and all null/false gates. The unchanged review-index and legacy-crosswalk checks also pass. No synthesis, owner route, runtime or progress change occurred.
