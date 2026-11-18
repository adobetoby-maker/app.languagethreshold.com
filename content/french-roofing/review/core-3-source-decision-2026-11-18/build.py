#!/usr/bin/env python3
"""Rebuild inert French Roofing Core 3 source decision from current files."""
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
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/core-1-3-draft.json"
FILES = (CURRICULUM, WORDS, PASSAGES, VERBS, ARCHIVE)
PAIR_ID = "core-roofing:3:fr-en"
CARD_HOLDS = {2, 4, 9, 10, 11, 14}
READER_HOLDS = {2, 4}


def source() -> dict:
    code = """const [c,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS[2],passage:p.ROOFING_LESSON_PASSAGES[3]}));"""
    data = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    data["verbs"] = json.loads((ROOT / VERBS).read_text())["lessons"]["3"]["verbs"]
    data["archive"] = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 3)
    return data


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == 3
    assert len(lesson["words"]) == len(archived["words"]) == 15
    assert passage["en"] == archived["reading"]["native"]
    assert len(passage["es"]) == len(passage["en"]) == len(archived["reading"]["target"]) == 8
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))

    cards = [{
        "id": f"{PAIR_ID}:card:{i}",
        "legacySourceRef": f"roofing:3:words:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "archivedFrenchEvidence": old["fr"],
        "conditionalFrench": None if i in CARD_HOLDS else old["fr"],
        "selectedFrench": None, "audioScript": None,
        "safetyOrMeaningHold": i in CARD_HOLDS, "reviewed": False,
    } for i, (word, old) in enumerate(zip(lesson["words"], archived["words"], strict=True), 1)]
    reader = [{
        "id": f"{PAIR_ID}:reader:{i}",
        "legacySourceRef": f"roofing:3:passage:{i}",
        "sourceSpanish": es, "sourceEnglish": en,
        "archivedFrenchEvidence": old,
        "conditionalFrench": None if i in READER_HOLDS else old,
        "selectedFrench": None, "audioScript": None,
        "safetyOrMeaningHold": i in READER_HOLDS, "reviewed": False,
    } for i, (es, en, old) in enumerate(zip(
        passage["es"], passage["en"], archived["reading"]["target"], strict=True,
    ), 1)]
    rows = [[row["sourceSpanish"], row["sourceEnglish"]] for row in cards + reader]
    return {
        "schema": "french-roofing-core3-source-decision-v1",
        "kind": "inert-source-decision", "pair": {"target": "English", "native": "French"},
        "stageId": "core-roofing", "sourceHeaderModuleId": "roofing",
        "proposedLessonId": "core-roofing:3", "proposedPairId": PAIR_ID,
        "identityStatus": "proposal-only; no runtime, saved-item, progress or V4 migration",
        "sourceFileSha256": {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in FILES},
        "orderedSourceRowsSha256": hashlib.sha256(json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
        "sourceTitleEnglish": lesson["title"], "sourceObjectiveEnglish": lesson["objective"],
        "sourceSpeakingEnglish": lesson["steps"][2]["instruction"],
        "sourceReaderTitleSpanish": passage["title"],
        "cards": cards, "reader": reader,
        "sourceVerbExamples": [{
            "spanishInfinitive": v["infinitive"], "englishMeaning": v["native"],
            "sourceSpanish": v["example"]["target"], "sourceEnglish": v["example"]["native"],
        } for v in data["verbs"]],
        "archivedDraft": {
            "titleFrench": archived["titleFrench"], "objectiveFrench": archived["objectiveFrench"],
            "speakingFrenchInstruction": archived["speakingFrenchInstruction"],
            "speakingFrenchOpening": archived["speakingFrenchOpening"],
            "grammarFocusFrench": archived["grammarFocusFrench"],
            "verbExamples": archived["verbs"],
            "regionalNotesEnglish": archived.get("regionalNotesEnglish", []),
            "status": "separate unapproved draft; no answer, audio or progress inheritance",
        },
        "sourceDecisionQuestions": [
            {"affectedIds": [f"{PAIR_ID}:card:2", f"{PAIR_ID}:reader:4"], "question": "Confirm the trade and locale sense of step flashing/solin à gradins, including whether the Reader says merely that it is present rather than that it was installed."},
            {"affectedIds": [f"{PAIR_ID}:card:4", f"{PAIR_ID}:card:11"], "question": "Select a French term for ice and water shield that preserves the product's water/ice role, and decide whether the archived phrase in the valley loses the source's up-the-valley direction."},
            {"affectedIds": [f"{PAIR_ID}:card:9"], "question": "Resolve roofing cement/cemento plástico: archived ciment de couverture may suggest cement rather than the intended bituminous roofing compound; confirm the product and locale sense."},
            {"affectedIds": [f"{PAIR_ID}:card:10", f"{PAIR_ID}:card:11", f"{PAIR_ID}:card:14"], "question": "Source imperative installation/sealing lines need qualified roofing and product-detail review before use as scored work instructions; preserve the source wording and do not add an unapproved universal method."},
            {"affectedIds": [f"{PAIR_ID}:reader:2"], "question": "The source places roof joints at valleys, chimneys and walls; archived French near chimneys and along walls changes the spatial relationship. Select a source-aligned sentence."},
            {"affectedIds": [f"{PAIR_ID}:card:7", f"{PAIR_ID}:card:15", f"{PAIR_ID}:reader:8"], "question": "Confirm leak/gotera versus fuite in this roof-water context and make the card, Reader, and dictionary sense consistent."},
        ],
        "selectedDecision": None, "audioScope": None,
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
        assert OUT.exists() and OUT.read_text() == expected, "Core 3 packet is stale"
        print("PASS French Roofing Core 3 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
