# Japanese Breakfast clinical source-fidelity audit — private draft

Pair: Japanese target / English support. Scope: all 60 source-aligned private drafts at PR #410, compared lesson by lesson with their pinned English `sourceEnglish` anchors and original Reader material. This audit checks **whether the intended terms and grammar appear in learner-facing Japanese**. It is not qualified Japanese, medical, food-safety or domain approval. All lessons remain `reviewed:false`, unregistered and without audio.

## Findings and bounded corrections

| Lesson | Source term or grammatical intent | Draft gap found | Correction |
| --- | --- | --- | --- |
| Core 25 | Burn, skin, cold water, napkins, first-aid kit and response to staff's apology | `火傷`, `皮膚` and `ナプキン` were missing; learner focus substituted a cooling/medical caveat | Added direct terms, paired dialogue requests and the apology/offer exchange; focus now teaches the requested phrases |
| Master 4 | Sesame traces, allergic reaction and epinephrine auto-injector | Auto-injector and reaction were left only in the English source | Added `微量`, `アレルギー反応`, `アドレナリン自己注射器` and a paired Reader line |
| Master 8 | Tree-nut anaphylaxis, antihistamine, auto-injector and negative request not to scrape nuts | Clinical terms and the direct negative request were omitted | Added `アナフィラキシー`, `抗ヒスタミン薬`, `アドレナリン自己注射器` and `取り除かないでください` with paired Reader lines |
| Master 10 | Altitude sickness, coca tea and reported speech | `高山病` and `コカ茶` were removed from learner content and replaced by a treatment disclaimer | Restored both terms; the scene reports the host's claim using `～と話しました`, without inventing a treatment instruction |
| Master 13 | Itchy throat, hives, lip swelling, breathing difficulty, dizziness and incident sequence | Several symptom terms were generalized or omitted | Added direct clinical terms and paired timeline lines; the kitchen's almond-flour report is attributed |
| Master 14 | Celiac disease and a nearly eaten wheat-flour item | `セリアック病` and the near-miss grammar were absent from Japanese | Added the term and `もう少しで～ところでした` in the Reader |
| Master 16–17 | Allergic reaction/allergen record; emergency-department information subject to consent | Terms appeared only in source or English explanation | Added Japanese terms; kept the source's consent-limited communication task |

Foundation 3, 8 and 10; Core 2, 3, 6, 15, 18, 24, 27 and 30; and Master 2, 3, 6, 19 and 20 had learner-facing warning or disclaimer language that displaced the language objective. Their focus/closure fields now teach the source vocabulary, Japanese grammar and scenario task directly. The retained allergy, shared handling, incident and consent dialogue is part of the source scenario, not an added medical treatment lesson. The correction script applies the changes idempotently after private source builders; it does not alter pinned source hashes, stable IDs, registration or review flags.

## Still open

- A fluent Japanese reviewer must check naturalness, register, kanji/kana choices, bilingual pair fidelity and pronunciation for the edited scenes. No Fable/Opus or human re-review is claimed for these corrections.
- Clinical vocabulary and grammatical examples do not require medical approval or learner-facing hedging. Source statements that assert treatment, procedures or food-handling facts still need factual review before release: the attributed coca-tea claim, hot-cup steam timing, and any claim about allergen handling or gluten-free preparation. This is a check of factual claims, not a gate on teaching terms such as `アナフィラキシー` or `セリアック病`.
- Emergency and hotel/consumer scenarios retain their separate factual review where they make operational claims.
- Source-anchored draft validation proves identity and structure, not translation quality, six-mode runtime operation, offline readiness or native release. Recorded Japanese audio and physical-device acceptance remain absent.

Rebuild order for this private stack: run the `build-japanese-travel-master-*.py` scripts in lesson order, then `scripts/apply-japanese-travel-clinical-fidelity.py`, then `scripts/validate-japanese-travel-breakfast-draft.py`. The Core file has no separate source generator in this stack; the idempotent correction script covers its changed entries.

Master 10 regeneration check (2026-11-08): `scripts/build-japanese-travel-master-10-12.py` now emits the corrected `高山病` and `コカ茶` cards, attributed Reader line, grammar focus and speaking task directly. A regeneration leaves `master-10-12-draft.json` byte-identical to the reviewed:false private fixture, so later builds cannot silently remove those terms. This is source-fidelity maintenance, not qualified approval of the host's factual claim.
