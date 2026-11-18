#!/usr/bin/env python3
"""Pin current Roofing Core 13 source as inert French review evidence."""
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
PAIR_ID = "core-roofing:13:fr-en"
CARD_HOLDS = {1, 2, 3, 4, 10, 11, 12, 13, 14}
READER_HOLDS = {3, 4, 6, 7}


def source() -> dict:
    code = """const [c,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS[12],passage:p.ROOFING_LESSON_PASSAGES[13]}));"""
    data = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    data["verbs"] = json.loads((ROOT / VERBS).read_text())["lessons"]["13"]["verbs"]
    data["archive"] = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 13)
    return data


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == 13
    assert len(lesson["words"]) == len(archived["words"]) == 14
    assert passage["en"] == archived["reading"]["native"]
    assert len(passage["es"]) == len(passage["en"]) == len(archived["reading"]["target"]) == 7
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))

    cards = [
        {
            "id": f"{PAIR_ID}:card:{i}",
            "legacySourceRef": f"roofing:13:words:{i}",
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
            "legacySourceRef": f"roofing:13:passage:{i}",
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
        "schema": "french-roofing-core13-source-decision-v1",
        "kind": "inert-source-decision",
        "pair": {"target": "English", "native": "French"},
        "stageId": "core-roofing",
        "sourceHeaderModuleId": "roofing",
        "proposedLessonId": "core-roofing:13",
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
            {"affectedIds": [f"{PAIR_ID}:card:1", f"{PAIR_ID}:card:3", f"{PAIR_ID}:reader:3", f"{PAIR_ID}:reader:4"], "question": "Goterón/vierteaguas names the drip edge; archived larmier is plausible but regional trade usage needs confirmation. Rake/borde de hastial becomes rive latérale du toit, which may cover a broader edge. Resolve term senses together with dictionary entries."},
            {"affectedIds": [f"{PAIR_ID}:card:2", f"{PAIR_ID}:card:12", f"{PAIR_ID}:reader:6"], "question": "Alero/eave is the lower roof edge; archived avant-toit may mean the entire overhang. Select a precise French trade term for the installation point under this plan."},
            {"affectedIds": [f"{PAIR_ID}:card:4", f"{PAIR_ID}:card:11", f"{PAIR_ID}:reader:4"], "question": "Sub-capa/fieltro and underlayment may name different materials across roof systems. Archived sous-couche is generic; choose the source and product-specific dictionary sense before scoring the under/over question."},
            {"affectedIds": [f"{PAIR_ID}:card:10", f"{PAIR_ID}:card:11", f"{PAIR_ID}:card:12", f"{PAIR_ID}:reader:4", f"{PAIR_ID}:reader:6"], "question": "The source card says install drip edge first, while the Reader asks under versus over underlayment and requires checking manufacturer instructions; the Reader 6 eave command is explicitly according to the plan. Do not promote an unconditional construction sequence without qualified roof-system and plan review."},
            {"affectedIds": [f"{PAIR_ID}:card:13", f"{PAIR_ID}:reader:7"], "question": "Cutting drip edge at the corner is this source scene's instruction, not a general cut detail. Confirm the actual approved product and corner detail before a scored imperative or audio script."},
            {"affectedIds": [f"{PAIR_ID}:card:14", f"{PAIR_ID}:reader:3", f"{PAIR_ID}:reader:5"], "question": "The source speaking ask is to have the installer explain the approved sequence; archived speaking adds a request to show manufacturer instructions. Keep the extra ask as domain evidence and maintain the exact source objective in scored modes until reviewed."},
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
        assert OUT.exists() and OUT.read_text() == expected, "Core 13 packet is stale"
        print("PASS French Roofing Core 13 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
