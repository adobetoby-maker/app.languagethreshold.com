#!/usr/bin/env python3
"""Pin current Roofing Core 15 source as inert French review evidence."""
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
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/core-13-15-draft.json"
FILES = (CURRICULUM, WORDS, PASSAGES, VERBS, ARCHIVE)
PAIR_ID = "core-roofing:15:fr-en"
CARD_HOLDS = {1, 2, 7, 8, 9, 10, 12, 13, 14, 15}
READER_HOLDS = {3, 4, 5, 6, 8, 9}


def source() -> dict:
    code = """const [c,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS[14],passage:p.ROOFING_LESSON_PASSAGES[15]}));"""
    data = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    data["verbs"] = json.loads((ROOT / VERBS).read_text())["lessons"]["15"]["verbs"]
    data["archive"] = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 15)
    return data


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == 15
    assert len(lesson["words"]) == len(archived["words"]) == 15
    assert passage["en"] == archived["reading"]["native"]
    assert len(passage["es"]) == len(passage["en"]) == len(archived["reading"]["target"]) == 9
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))

    cards = [
        {
            "id": f"{PAIR_ID}:card:{i}",
            "legacySourceRef": f"roofing:15:words:{i}",
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
            "legacySourceRef": f"roofing:15:passage:{i}",
            "sourceSpanish": es,
            "sourceEnglish": en,
            "archivedFrenchEvidence": old,
            "conditionalFrench": None if i in READER_HOLDS else old,
            "selectedFrench": None,
            "audioScript": None,
            "safetyOrMeaningHold": i in READER_HOLDS,
            "reviewed": False,
        }
        for i, (es, en, old) in enumerate(zip(
            passage["es"], passage["en"], archived["reading"]["target"], strict=True,
        ), 1)
    ]
    ordered_rows = [
        [row["sourceSpanish"], row["sourceEnglish"]] for row in cards + reader
    ]
    return {
        "schema": "french-roofing-core15-source-decision-v1",
        "kind": "inert-source-decision",
        "pair": {"target": "English", "native": "French"},
        "stageId": "core-roofing",
        "sourceHeaderModuleId": "roofing",
        "proposedLessonId": "core-roofing:15",
        "proposedPairId": PAIR_ID,
        "identityStatus": "proposal-only; no runtime, saved-item, progress or V4 migration",
        "sourceFileSha256": {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in FILES},
        "orderedSourceRowsSha256": hashlib.sha256(json.dumps(ordered_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
        "sourceTitleEnglish": lesson["title"],
        "sourceObjectiveEnglish": lesson["objective"],
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
            {"affectedIds": [f"{PAIR_ID}:card:1", f"{PAIR_ID}:reader:1", f"{PAIR_ID}:reader:8"], "question": "Confirm regional roofing sense of limahoya/valley and French noue with a qualified trade reviewer; the source speaks about water flow at the valley, not a generic roof edge."},
            {"affectedIds": [f"{PAIR_ID}:card:2", f"{PAIR_ID}:card:10", f"{PAIR_ID}:reader:5"], "question": "The source names an ice-and-water shield in the English row but Spanish says membrana impermeable. Archived French specifies water-and-ice protection. Confirm product and membrane scope before scoring or recording a placement command."},
            {"affectedIds": [f"{PAIR_ID}:card:7", f"{PAIR_ID}:reader:7"], "question": "Spanish gotera and English leak may mean a roof leak, water ingress or a dripping point. Archived fuite may be broad; choose the contextual dictionary sense."},
            {"affectedIds": [f"{PAIR_ID}:card:8", f"{PAIR_ID}:card:9"], "question": "Flashing/tapajuntas and asphalt shingle/teja asfáltica require contextual trade senses. Archived solin and generic bardeau may omit the asphalt modifier or vary by region."},
            {"affectedIds": [f"{PAIR_ID}:card:12", f"{PAIR_ID}:card:13", f"{PAIR_ID}:reader:4", f"{PAIR_ID}:reader:6"], "question": "The source directs peeling the backing paper and pressing membrane flat against the deck. Confirm adhesive/backing and substrate terms and approved product method before treating the imperatives as work instructions."},
            {"affectedIds": [f"{PAIR_ID}:card:14", f"{PAIR_ID}:reader:3"], "question": "The source says cut membrane to length, but does not state a measured length or width. Keep archived bonne longueur conditional until plan/product detail is checked."},
            {"affectedIds": [f"{PAIR_ID}:card:15", f"{PAIR_ID}:reader:8", f"{PAIR_ID}:reader:9"], "question": "The source asks whether the entire valley is covered and to show protection before covering it. Archived entièrement protégée could imply protection quality rather than complete coverage; align the question and speaking objective with the source. Archived speaking also adds the product sheet and approved details."},
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
        assert OUT.exists() and OUT.read_text() == expected, "Core 15 packet is stale"
        print("PASS French Roofing Core 15 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
