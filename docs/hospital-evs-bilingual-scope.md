# Hospital EVS bilingual course and site-language setting — draft scope

Status: owner approved a separate Hospital EVS course in both language directions on November 2, 2026. Course authoring is in progress; no new course or interface-language option is live. Initial audit used checkout `c7594bf09587a47f1b49069d5785c63d58941335` with `audit-module.mjs`.

## Product boundary

Teach practical communication for hospital Environmental Services (EVS) staff in two separately authored directions:

1. **English learned with Spanish support** (primary): Spanish-speaking staff communicating in English at work.
2. **Spanish learned with English support**: English-speaking staff communicating in Spanish at work.

Do not reverse a glossary or swap translation fields and claim a second course. Use stable, pair-specific lesson, speaking, deck, and progress identities. Keep existing `or-evs` learner progress intact.

The existing `or-evs` catalog track is OR-branded. Its English/Spanish 10 Foundation + 30 Core + 20 Master authored lessons validate as a **draft**, but the module audit reports zero mapped teaching settings, shared reading definitions, full Reader passages, complete authored module decks, or registered offline packs. The Spanish/English pair is not catalog-supported and has zero authored lessons. The OR-branded 60-lesson material contains some general hospital communication but is not yet a complete hospital-wide cleaning course. These are source-coverage findings, not human linguistic or clinical approval.

Owner decision: add a distinct Hospital EVS product and retain `or-evs` as an OR specialization. Use two exact-pair course IDs, `hospital-evs-en` (English target, Spanish support) and `hospital-evs-es` (Spanish target, English support), with their own Foundation/Core/Master lesson, speaking, Reader, deck, download, and progress identities. Do not map old `or-evs` completion onto either course. The paired 10/30/20 authoring plan is in `content/hospital-evs/course-plan.json`; it is a plan, not validated lesson content.

Authoring ledger, November 2: the plan has 60 distinct scene briefs for **each** exact direction, spanning patient rooms, bathrooms, OR, biohazards, and shift handoffs. `content/hospital-evs/pilot-lessons.json` holds one independently authored Foundation lesson per direction; both pass the real lesson-content validator, but neither has human EVS/bilingual review. The remaining 59 lessons per direction are briefs only. The course IDs are **not** in the learner-facing catalog, curriculum, speaking, Reader, decks, or offline registry. No live availability or 60-lesson completion is claimed. `tests/hospital-evs-course-plan.test.mjs` guards the exact pair IDs, 10/30/20 plan, topic coverage, and pilot content validation.

## Proposed 10/30/20 learning path for each direction

| Stage | Communication focus | Workplace contexts |
| --- | --- | --- |
| Foundation 10 | Introductions, location, time, supplies, warnings, permission, clarification, handoff | Patient rooms, bathrooms, carts, nurse station |
| Core 30 | Clear task requests and status reports, isolation-sign vocabulary, surface-cleaning language, correct product/label questions, spill and waste escalation | Occupied/discharge patient rooms, private/shared toilets, OR pre-case/between-case/terminal cleaning, biohazard handling |
| Master 20 | Ambiguous instructions, near misses, incident reports, patient/coworker communication, supervisor handoffs, quality checks | Mixed-priority shift scenarios, OR delays, exposure and chemical concerns |

Every lesson needs original aligned dialogue/reading, vocabulary, verbs, the six practice modes, a lesson-linked speaking card, Reader and deck ownership, review/checkpoint links, and pair-specific downloads where supported. Specialist packs, human-recorded audio, and formal exams are separate deliverables; do not imply they exist by default.

## Safety and review boundary

This is language practice, **not** a substitute for employer training, the facility's written SOP, product label, PPE requirements, or infection-prevention direction. Do not teach a universal bag color, disinfectant dilution/contact time, room-release authority, or sharps-handling procedure. Dialogue should model asking the assigned nurse/supervisor and following the local checklist.

**Owner review sequence, November 3:** the human safety review will take place in TestFlight after a complete native candidate is available. Keep the course marked unreviewed in source and in the candidate until that review is actually completed; resolve findings before public release. This website course draft alone cannot be installed through TestFlight. The owner has not yet identified which native app should carry the Hospital EVS candidate, so native integration and TestFlight distribution are not assumed or authorized by this note.

Separate **environmental surface cleaning/disinfection** from **instrument reprocessing/sterilization**. CDC assigns critical and semicritical OR equipment to specialized reprocessing, not environmental cleaning staff; the hospital EVS course may teach recognition, safe handoff, and whom to ask, but instrument-sterilization steps require a separately scoped sterile-processing role and expert review. Obtain human review by an EVS lead/infection-prevention professional and bilingual reviewer before release.

Sources to guide authoring, not text to copy:

- [CDC environmental cleaning procedures](https://www.cdc.gov/healthcare-associated-infections/hcp/cleaning-global/procedures.html) (global/resource-limited guidance; check U.S. facility policy for local use)
- [CDC disinfection and sterilization recommendations](https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/summary-recommendations.html)
- [OSHA hospital housekeeping and bloodborne pathogens](https://www.osha.gov/etools/hospitals/housekeeping/bloodborne-pathogens)
- [CDC regulated medical waste](https://www.cdc.gov/infection-control/hcp/environmental-control/regulated-medical-waste.html)

## Independent site display language — separate branch after the courses

The owner requested a separate branch for this work after the two Hospital EVS courses are built. Do not mix the site-shell translation change into the Hospital EVS module branch.

Current site state has `selectedLanguage` (what the learner studies) and `nativeLanguage` (support/translation language). App navigation and settings labels are predominantly hard-coded English. Add a third, independent **Site language** preference in desktop Learning settings and mobile App settings. It must never silently follow native language or change course direction, lesson text, speaking target, account access, or saved progress. Default to English for existing users; allow explicit change and persistence. Use the same setting across the site shell and non-lesson pages, with a visible fallback when a string is not yet translated.

Recommended first release: fully translate the shared navigation, settings, onboarding, modules/catalog, account, purchase, and safety-critical messages into English and Spanish before exposing the toggle. Additional site languages are a separate translation/QA rollout. Course language remains independently selected. Test direct links, reload, signed-in sync, mobile/desktop, and accessibility labels in both site languages.

## Release gates

- Choose product identity and whether sterile processing is a separate role/course.
- Author and validate both exact 60-lesson language pairs; map teaching, Reader, decks, speaking, review, and downloads.
- Human bilingual and EVS/infection-prevention review of safety-sensitive wording in TestFlight; retain review flags as false until completed and resolve findings before public release.
- Choose the native app that will carry the Hospital EVS TestFlight candidate and separately verify its course integration, identity, and build before inviting review.
- Verify representative Foundation/Core/Master lessons and all six modes for both pairs on desktop and phone; verify supported/unsupported pairs and installed offline behavior.
- Translate and test the site shell before enabling Site language; do not present a partial-English page as fully localized.
- Only then use the normal PR, deployment, and production read-back workflow. No deployment or App Store action is authorized by this draft.
