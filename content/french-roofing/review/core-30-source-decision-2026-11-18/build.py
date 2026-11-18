#!/usr/bin/env python3
"""Pin current Roofing Core 30 source as inert French review evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
OUT = HERE / "packet.json"
CURRICULUM = "src/data/roofing-curriculum.ts"
WORDS = "src/data/roofing-lesson-words.ts"
PASSAGES = "src/data/roofing-lesson-passages.ts"
VERBS = "public/lesson-content/es/roofing.json"
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/core-28-30-draft.json"
FILES = (CURRICULUM, WORDS, PASSAGES, VERBS, ARCHIVE)
PAIR_ID = "core-roofing:30:fr-en"
CARD_HOLDS = {2, 3, 5, 7, 8, 9, 10, 12, 13, 14, 15}
READER_HOLDS = {3, 4, 5, 6, 7, 8, 9}


def source() -> dict:
    code = """const [c,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS[29],passage:p.ROOFING_LESSON_PASSAGES[30]}));"""
    data = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    data["verbs"] = json.loads((ROOT / VERBS).read_text())["lessons"]["30"]["verbs"]
    data["archive"] = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 30)
    return data


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == 30
    assert len(lesson["words"]) == len(archived["words"]) == 16
    assert len(passage["es"]) == len(passage["en"]) == len(archived["reading"]["target"]) == 9
    assert len(archived["reading"]["native"]) == 9
    assert [i for i, (current, old) in enumerate(zip(passage["en"], archived["reading"]["native"], strict=True), 1) if current != old] == [7]
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))

    cards = [
        {
            "id": f"{PAIR_ID}:card:{i}",
            "legacySourceRef": f"roofing:30:words:{i}",
            "sourceSpanish": word["es"],
            "sourceEnglish": word["en"],
            "kind": word["kind"],
            "archivedFrenchEvidence": old["fr"],
            "conditionalFrench": None if i in CARD_HOLDS else old["fr"],
            "selectedFrench": None,
            "audioScript": None,
            "safetyOrMeaningHold": i in CARD_HOLDS,
            "reviewed": False,
        }
        for i, (word, old) in enumerate(zip(lesson["words"], archived["words"], strict=True), 1)
    ]
    reader = [
        {
            "id": f"{PAIR_ID}:reader:{i}",
            "legacySourceRef": f"roofing:30:passage:{i}",
            "sourceSpanish": es,
            "sourceEnglish": en,
            "archivedEnglishEvidence": old_en,
            "archivedFrenchEvidence": old_fr,
            "conditionalFrench": None if i in READER_HOLDS else old_fr,
            "selectedFrench": None,
            "audioScript": None,
            "safetyOrMeaningHold": i in READER_HOLDS,
            "reviewed": False,
        }
        for i, (es, en, old_en, old_fr) in enumerate(zip(
            passage["es"], passage["en"], archived["reading"]["native"], archived["reading"]["target"], strict=True,
        ), 1)
    ]
    ordered_rows = [
        [row["sourceSpanish"], row["sourceEnglish"]] for row in cards + reader
    ]
    return {
        "schema": "french-roofing-core30-source-decision-v1",
        "kind": "inert-source-decision",
        "pair": {"target": "English", "native": "French"},
        "stageId": "core-roofing",
        "sourceHeaderModuleId": "roofing",
        "proposedLessonId": "core-roofing:30",
        "proposedPairId": PAIR_ID,
        "identityStatus": "proposal-only; no runtime, saved-item, progress or V4 migration",
        "sourceFileSha256": {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in FILES},
        "orderedSourceRowsSha256": hashlib.sha256(json.dumps(ordered_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
        "sourceTitleEnglish": lesson["title"],
        "sourceObjectiveEnglish": lesson["objective"],
        "curriculumAdaptationNote": "Current source objective says lead a roofing day in Spanish; English target with French support needs a qualified English-learning objective, while exact source wording stays pinned.",
        "sourceSpeakingEnglish": lesson["steps"][2]["instruction"],
        "sourceReaderTitleSpanish": passage["title"],
        "cards": cards,
        "reader": reader,
        "sourceVerbExamples": [
            {"spanishInfinitive": v["infinitive"], "englishMeaning": v["native"], "sourceSpanish": v["example"]["target"], "sourceEnglish": v["example"]["native"]}
            for v in data["verbs"]
        ],
        "archivedDraft": {
            "titleFrench": archived["titleFrench"],
            "objectiveFrench": archived["objectiveFrench"],
            "speakingFrenchInstruction": archived["speakingFrenchInstruction"],
            "speakingFrenchOpening": archived["speakingFrenchOpening"],
            "grammarFocusFrench": archived["grammarFocusFrench"],
            "verbExamples": archived["verbs"],
            "regionalNotesEnglish": archived.get("regionalNotesEnglish", []),
            "status": "separate unapproved draft; no answer, audio or progress inheritance",
        },
        "sourceDecisionQuestions": [
            {"affectedIds": [f"{PAIR_ID}:card:1", f"{PAIR_ID}:reader:1"], "question": "The current source objective literally says lead a complete roofing day in Spanish. The archived French objective changes the language to French, but English is the target for this pair. Keep exact source provenance and obtain a qualified English-learning capstone objective before learner use."},
            {"affectedIds": [f"{PAIR_ID}:card:2", f"{PAIR_ID}:card:3", f"{PAIR_ID}:card:5", f"{PAIR_ID}:card:15", f"{PAIR_ID}:reader:4", f"{PAIR_ID}:reader:9"], "question": "Tear-off and closeout are trade process terms; the source has an install/instalación part-of-speech mismatch, while archived poser is a verb for a term labeled instalación. Confirm English target, French support and dictionary senses, and whether the tear-off/install sequence is job-specific rather than universal."},
            {"affectedIds": [f"{PAIR_ID}:card:7", f"{PAIR_ID}:card:8", f"{PAIR_ID}:card:9", f"{PAIR_ID}:reader:5"], "question": "Underlayment, flashing, deck and tarp require roof-system/product scope; the Reader says the lead checks each step. Archived platelage, sous-couche and solin may be conditional but cannot select a specific assembly or inspection approval."},
            {"affectedIds": [f"{PAIR_ID}:card:12", f"{PAIR_ID}:reader:3"], "question": "The source tie-off command mentions a harness without an approved anchor, fall-clearance or site system. Archived attachez-vous is broader and can obscure the tie-off requirement. Hold for qualified fall-protection and French terminology review."},
            {"affectedIds": [f"{PAIR_ID}:card:13", f"{PAIR_ID}:reader:6", f"{PAIR_ID}:reader:7"], "question": "The source storm warning is followed by a conditional order to stop and descend if weather changes, then an unfinished-section tarp action. Archived Reader 7 changes its English anchor by adding 'once conditions allow safe work under the approved plan'; preserve the current source exact text and hold the timing, weather stop and tarp access sequence for qualified safety/source review."},
            {"affectedIds": [f"{PAIR_ID}:card:10", f"{PAIR_ID}:card:14", f"{PAIR_ID}:reader:8", f"{PAIR_ID}:reader:9"], "question": "Punch list/closeout and the final roof walk must remain open-item and day-end scene meanings, not unconditional roof access or completion certification. Archived speaking adds safety-plan and temporary-cover assertions beyond the source roleplay objective."},
        ],
        "selectedDecision": None,
        "audioScope": None,
        "modeEvidence": "Archive grammar and lesson steps are not six authored prompt/target activity pairs",
        "gates": {key: False for key in (
            "reviewed", "qualifiedFrenchReview", "qualifiedRoofingReview", "qualifiedSourceReview", "qualifiedDictionaryReview",
            "learnerRegistered", "scoringRegistered", "audioRegistered", "listeningReviewed", "offlineRegistered",
            "progressRegistered", "savedItemMapped", "browserAccepted", "nativeV4Registered",
        )},
    }


if __name__ == "__main__":
    expected = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.exists() and OUT.read_text() == expected, "Core 30 packet is stale"
        print("PASS French Roofing Core 30 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
