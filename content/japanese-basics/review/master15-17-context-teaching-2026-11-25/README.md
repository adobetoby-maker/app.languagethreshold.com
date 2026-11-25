# Japanese 101 Master 15–17: authored role/context teaching alternatives

This source-only batch adds 18 explicit bilingual six-mode prompt/target pairs, nine contextual form explanations and three counterpart/closing-turn repairs. All Japanese/English target faces remain exact existing source text. The prior lesson objects, extensions, form IDs/answers, known variants, missions, code and progress identities are unchanged. This is teaching content, not another normalization helper or a runtime registration.

## Verified authored defect

For all three lessons the private support’s `partnerRole` contains the learner instruction:

- Master 15: “Guide a visitor from the station to a classroom.”
- Master 16: “Discuss current work and tomorrow’s visit with a friend.”
- Master 17: “Clarify which book should be handed to Aki.”

The private generator assigns `support['partnerRole'] = entry['role']`; the preview repeats `next.partnerRole = authored.role`. This can give the counterpart the learner’s job, leaving no clear actor to answer the route or book-reference questions. The alternatives supply distinct actors and exact Japanese/English closing turns while preserving the old English closure instructions separately.

## Bounded lesson repairs

| Lesson | Actual authored teaching/context work | Source limit preserved |
|---|---|---|
| 15: directions | Six role-specific directions/location/arrival prompts. Forms contrast location に with action-location で and explain いけます. The guide checks the route; the visitor owns the “I can get to the school” response and closing turn. A Hear task asks the visitor to listen to the guide, rather than listen for the visitor’s own utterance. | No invented starting position or route step. Existing いってください “please go” stays in its route context; the course already distinguishes it from “please say.” |
| 16: now, plans, not yet | Six prompts distinguish present activity, intention, schedule, a past call, “not yet set” and another planned call. Forms explain つもり/よてい without implying that the exact meeting time is already fixed. A separate later source-extension frame records the three-o’clock agreement and settled plan. | No invented completion of a call, new day/time or claim that the afternoon station trip’s day is explicitly stated. The core mission closes with the source’s planned call tonight, before the separate settled-plan frame. |
| 17: book reference | Six prompts assign the handoff request to the requester and the clarification question to the recipient. The requester answers “I mean the blue book” as the closing turn. Form explanations connect the omitted object in わたしてください to the need for どの ほんの ことですか. | No claim about who physically holds the books or owns both. Japanese さっき かいました omits its buyer, while the English says Tanaka; no new target uses that line and no buyer is invented. This is flagged as context-dependent, not declared an unconditional mistranslation. |

Every Hear option is an exact source face. The activity’s `roleEnglish` labels the target speaker; the English cue explicitly identifies the learner’s listening or production role. Standalone practice may rehearse the counterpart voice without changing the mission’s learner role. Speaker assignments are proposed practice casting because the original source has no speaker labels.

## Identity and release boundary

The selected Master 15–17 lesson objects and extensions match both current main and the immutable private #488 source. Main/source hashes are pinned; nine existing private form IDs are retained as provenance references, not re-registered identities. The new 30 item IDs are source-only review references. No accepted-answer list, six-mode engine, Reader/library import, dictionary runtime, audio, offline pack or saved-item/progress mapping changes.

All selections/audio remain null and all qualified review, learner/scoring, audio/listening, offline, progress, browser and V4 gates remain false. Qualified Japanese/source review must settle actor assignments, the Master 16 time-frame interpretation and Master 17 referents before any promotion. Full exact-pair browser/phone/offline/progress/native acceptance and listening remain separate missing work. These supplements do not establish three fully released lessons or a completed course.

Explicit safe-mode Haiku 5.5 authored the content, Opus 5.5 supplied read-only critique, Fable 5.2 corrected it and source-grounded self-check fixed listener/speaker roles, preserved the later settled-plan frame and removed unsupported possession claims. Actual model usage/session metadata is adjacent. AI review is not qualified approval.

Run `python3 content/japanese-basics/review/master15-17-context-teaching-2026-11-25/validate.py --private-pr` after fetching immutable #488 head `018e69872875ae15acc7381368bac199bf61171e`. Validation passes all 18 exact Japanese/English targets, six actual modes per lesson, three exact-source Hear option sets, nine canonical form identities, source openings/closings, word banks, 30 unique IDs, null/false gates and five private provenance pins. Default validation independently checks main source and candidate structure; it makes no private-source execution claim.

No synthesis, owner page, runtime promotion, scoring or progress write occurred.
