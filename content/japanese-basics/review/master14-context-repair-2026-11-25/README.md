# Master 14: authored speaking and form-context repair

This source-only alternative fixes an actual counterpart/context mapping defect in the private routine draft, rather than adding answer normalization. It preserves the prior draft, canonical Japanese/English answers, three existing form IDs, source order and lesson identity. No existing source or adapter file is edited.

The current immutable #488 head is `018e69872875ae15acc7381368bac199bf61171e`; #488 and #485 remain open drafts. Main `683113d8e040cabdb81f288f9df02a8237a4ea3b` still has the earlier delayed-meeting source. This packet neither promotes the routine nor claims its release gates passed.

## Concrete defect and content repair

The private support file sets `partnerRole` to **“Explain a usual weekday and today’s delayed station meeting to a friend”**, which is the learner task, not the counterpart actor. This is reproduced by `support['partnerRole'] = entry['role']` in the private speaking builder and `next.partnerRole = authored.role` in its preview builder. The alternative supplies an actual friend/listener role with short questions, distinct from the narrator and the friend met at the station.

The prior mission’s English closure instruction is preserved. A separate Japanese/English closing utterance now comes from source extension 4. The three preceding source extension turns explicitly retain the final meeting, apology and response, including the source’s actual three-thirty meeting time versus the earlier three-o’clock plan. Nothing is silently normalized or added to that chronology.

Three authored bilingual context slots bind existing canonical form answers to playable exchanges:

| Existing form ID | Context and counterpart prompt | Canonical target |
|---|---|---|
| `form-ja-en-6e3080062b60d00a` | Friend asks what comes first in the morning (source turn 2). Japanese/English explanations teach sequencing with まず and the linked て-form. | Source turn 3: wash face and eat breakfast. |
| `form-ja-en-5a8711b33c9b3218` | Friend asks about after work (source turn 5). The learner first says the exact usual-home line (turn 6), so the following でも contrast has a real antecedent. | Source turn 7: today’s planned station meeting. |
| `form-ja-en-e2fe935c347bd01c` | Clearly authored polite recap question: それから どう しましたか。 / “Then what did you do?” It does not presuppose the arrival being reported. | Source turn 14: completed arrival and the friend’s ongoing waiting at that moment. |

The usual routine/current plan, delay at that point and later past recap are explicit phases. The explanations do not claim that the train delay still continues “now” during the later recap. Opening and closing have learner speaker labels; counterpart questions and the newly authored scaffold have distinct provenance.

## Review boundaries

All selections and audio remain null, every review/runtime/scoring/listening/offline/progress/browser/V4 gate remains false, and the existing known-answer lists are unchanged. The packet proposes explicit counterpart and bilingual closing-line fields; it does not blindly replace an English instruction field with a Japanese utterance. A future qualified change must update the canonical mission, counterpart binding, derived support/preview, form context and exact-text audio identities together. No existing six-mode engine or source registration is changed or claimed complete.

The routine’s さいごに already exists in extension 14, so no missing-marker error is claimed. `inherit:[16]` refers to Core 16 terms in the builder, not a Master 14 identity discrepancy. Qualified Japanese/source review, the remaining routine/source integration decision, listening, exact-pair browser/phone/offline/progress and independent V4 acceptance remain open.

Explicit safe-mode Haiku 5.5 authored support, Opus 5.5 supplied read-only critique, Fable 5.2 corrected it, and source-grounded self-check added the playable usual-home lead-in and complete pre-closing narration. Actual model metadata is adjacent. AI assistance is not qualified approval.

Run `python3 content/japanese-basics/review/master14-context-repair-2026-11-25/validate.py --private-pr` after fetching immutable #488 head. It passes seven private-source pins, the three exact form IDs/targets, two exact counterpart questions, explicit lead-in, source opening/final four turns/word bank and the actual generator-role defect. Default validation checks the pinned main source and local candidate invariants and makes no private-source execution claim.

No synthesis, owner page, runtime import, scoring or progress migration occurred.
