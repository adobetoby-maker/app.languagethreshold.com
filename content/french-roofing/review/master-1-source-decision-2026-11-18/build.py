#!/usr/bin/env python3
"""Pin current Roofing Master 1 as inert French review evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
OUT = HERE / "packet.json"
CURRICULUM = "src/data/master-roofing-curriculum.ts"
CONTENT = "public/lesson-content/es/master-roofing.json"
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/master-1-3-draft.json"
FILES = (CURRICULUM, CONTENT, ARCHIVE)
PAIR_ID = "master-roofing:1:fr-en"
CARD_HOLDS = {2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15, 17, 18, 19}
READER_HOLDS = {3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17}


def source() -> dict:
    code = """const c=await import('./src/data/master-roofing-curriculum.ts');console.log(JSON.stringify(c.MASTER_ROOFING_LESSONS[0]));"""
    lesson = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    content = json.loads((ROOT / CONTENT).read_text())["lessons"]["1"]
    archived = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 1)
    return {"lesson": lesson, "content": content, "archive": archived}


def build() -> dict:
    data = source()
    lesson, content, archived = data["lesson"], data["content"], data["archive"]
    passage = content["passage"]
    assert lesson["n"] == archived["n"] == 1
    assert len(lesson["words"]) == len(archived["words"]) == 21
    assert len(passage["target"]) == len(passage["native"]) == len(archived["reading"]["target"]) == 17
    assert passage["native"] == archived["reading"]["native"]
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))
    assert [example["en"] for example in lesson["grammar"]["examples"]] == archived["grammarExamplesEnglish"]

    cards = [
        {
            "id": f"{PAIR_ID}:card:{i}",
            "legacySourceRef": f"master-roofing:1:words:{i}",
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
            "legacySourceRef": f"master-roofing:1:passage:{i}",
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
            passage["target"], passage["native"], archived["reading"]["target"], strict=True,
        ), 1)
    ]
    ordered_rows = [[row["sourceSpanish"], row["sourceEnglish"]] for row in cards + reader]
    return {
        "schema": "french-roofing-master1-source-decision-v1",
        "kind": "inert-source-decision",
        "pair": {"target": "English", "native": "French"},
        "stageId": "master-roofing",
        "sourceHeaderModuleId": "master-roofing",
        "archivedHeaderModuleId": "roofing",
        "proposedLessonId": "master-roofing:1",
        "proposedPairId": PAIR_ID,
        "identityStatus": "proposal-only; no runtime, saved-item, progress or V4 migration",
        "sourceFileSha256": {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in FILES},
        "orderedSourceRowsSha256": hashlib.sha256(json.dumps(ordered_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
        "sourceTitleEnglish": lesson["title"],
        "sourceObjectiveEnglish": lesson["objective"],
        "sourceSpeakingEnglish": lesson["steps"][2]["instruction"],
        "sourceGrammarFocusEnglish": lesson["grammar"]["focus"],
        "sourceGrammarExamples": lesson["grammar"]["examples"],
        "sourceReaderTitleSpanish": passage["title"],
        "cards": cards,
        "reader": reader,
        "sourceVerbExamples": [
            {"spanishInfinitive": v["infinitive"], "englishMeaning": v["native"], "sourceSpanish": v["example"]["target"], "sourceEnglish": v["example"]["native"]}
            for v in content["verbs"]
        ],
        "archivedDraft": {
            "titleFrench": archived["titleFrench"],
            "objectiveFrench": archived["objectiveFrench"],
            "speakingFrenchInstruction": archived["speakingFrenchInstruction"],
            "speakingFrenchOpening": archived["speakingFrenchOpening"],
            "grammarFocusFrench": archived["grammarFocusFrench"],
            "verbExamples": archived["verbs"],
            "regionalNotesEnglish": archived.get("reviewGapsEnglish", []),
            "status": "separate unapproved draft; no answer, audio or progress inheritance",
        },
        "sourceDecisionQuestions": [
            {"affectedIds": [f"{PAIR_ID}:card:2", f"{PAIR_ID}:card:3", f"{PAIR_ID}:card:4", f"{PAIR_ID}:card:5", f"{PAIR_ID}:card:7", f"{PAIR_ID}:reader:3", f"{PAIR_ID}:reader:5", f"{PAIR_ID}:reader:6"], "question": "The source presents a deck-to-ridge sequence and names underlayment, drip edge, starter strip and ice/water shield. Confirm the actual product, climate, approved plans and manufacturer instructions before selecting a scored French construction order; the archived plan qualifier is separate evidence, not a source answer."},
            {"affectedIds": [f"{PAIR_ID}:card:8", f"{PAIR_ID}:card:9", f"{PAIR_ID}:card:11", f"{PAIR_ID}:card:12", f"{PAIR_ID}:card:13", f"{PAIR_ID}:reader:11", f"{PAIR_ID}:reader:12", f"{PAIR_ID}:reader:13"], "question": "Flashing, valley, ridge cap, ridge vent and eave have regional/product-specific French senses. Source Reader 11 says wall/chimney joints are weak points; archived French softens this to joints needing attention. Decide exact teaching meaning and roof-system terminology before answer selection."},
            {"affectedIds": [f"{PAIR_ID}:card:15", f"{PAIR_ID}:card:17", f"{PAIR_ID}:card:18", f"{PAIR_ID}:reader:8", f"{PAIR_ID}:reader:9", f"{PAIR_ID}:reader:10", f"{PAIR_ID}:reader:15"], "question": "The source says water always runs downhill and each course never lets water under it. Archived French omits the always in one card/Reader line, and the absolute water path depends on the selected system and conditions. Qualified source/trade review must reconcile the exact learner meaning without presenting an installation guarantee."},
            {"affectedIds": [f"{PAIR_ID}:card:19", f"{PAIR_ID}:reader:14", f"{PAIR_ID}:reader:16", f"{PAIR_ID}:reader:17"], "question": "Check informal new-hire and formal client address and the nuance of Am I making sense? versus archived Est-ce que je suis clair? Keep the separate archived speaking request to consult approved plans distinct from the source objective."},
        ],
        "selectedDecision": None,
        "audioScope": None,
        "modeEvidence": "Archive practice labels and lesson steps are not six authored prompt/target activity pairs",
        "gates": {key: False for key in (
            "reviewed", "qualifiedFrenchReview", "qualifiedRoofingReview", "qualifiedSourceReview", "qualifiedDictionaryReview",
            "learnerRegistered", "scoringRegistered", "audioRegistered", "listeningReviewed", "offlineRegistered",
            "progressRegistered", "savedItemMapped", "browserAccepted", "nativeV4Registered",
        )},
    }


if __name__ == "__main__":
    expected = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.exists() and OUT.read_text() == expected, "Master 1 packet is stale"
        print("PASS French Roofing Master 1 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
