#!/usr/bin/env python3
"""Pin current Roofing Master 4 source as inert French review evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
OUT = HERE / "packet.json"
N = 4
PAIR_ID = f"master-roofing:{N}:fr-en"
CURRICULUM = "src/data/master-roofing-curriculum.ts"
LESSON_CONTENT = "public/lesson-content/es/master-roofing.json"
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/master-4-6-draft.json"
FILES = (CURRICULUM, LESSON_CONTENT, ARCHIVE)
CARD_HOLDS = {3, 4, 5, 7, 8, 9, 10, 16, 17, 20}
READER_HOLDS = {1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14}
QUESTIONS = [
    (["card:3", "card:4", "card:7", "card:9", "card:10", "reader:1", "reader:5", "reader:6", "reader:8", "reader:14"],
     "Step flashing, pipe boot, minimum overlap, sidewall and siding require exact French roofing senses. The source presents a fictional manufacturer sheet; identify an actual system before these steps become scored product instructions."),
    (["card:5", "card:8", "reader:5", "reader:6", "reader:7", "reader:8", "reader:9"],
     "The source orders underlayment, fastening to deck only, siding coverage and no sealant substitution, and makes a conditional manufacturer-damage claim. Qualified product and safety review must resolve each before selecting French answers."),
    (["card:16", "card:17", "reader:2", "reader:3", "reader:11", "reader:12", "reader:13"],
     "The source says to follow the sheet, not habit, and verify truck material against the sheet. Preserve those relationships while avoiding a universal claim that one fictional sheet governs every system."),
    (["card:20", "reader:10", "reader:11"],
     "Kevin's question to Rogelio and Rogelio's answer use a familiar work relationship in the Spanish scene. The archived French mixes vous and tu; resolve dialogue register before selecting a scored turn."),
]


def source() -> dict:
    code = f"""import {{MASTER_ROOFING_LESSONS}} from './{CURRICULUM}'; console.log(JSON.stringify(MASTER_ROOFING_LESSONS[{N - 1}]));"""
    lesson = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code], cwd=ROOT, text=True,
    ))
    content = json.loads((ROOT / LESSON_CONTENT).read_text())["lessons"][str(N)]
    archived = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == N)
    return {"lesson": lesson, "passage": content["passage"], "verbs": content["verbs"], "archive": archived}


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == N
    assert len(lesson["words"]) == len(archived["words"]) == 21
    assert passage["native"] == archived["reading"]["native"]
    assert len(passage["target"]) == len(passage["native"]) == len(archived["reading"]["target"]) == 16
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))
    cards = [{
        "id": f"{PAIR_ID}:card:{i}",
        "legacySourceRef": f"master-roofing:{N}:words:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"],
        "sourceNoteSpanish": word.get("note"), "kind": word["kind"],
        "archivedFrenchEvidence": old["fr"],
        "conditionalFrench": None if i in CARD_HOLDS else old["fr"],
        "selectedFrench": None, "audioScript": None,
        "safetyOrMeaningHold": i in CARD_HOLDS, "reviewed": False,
    } for i, (word, old) in enumerate(zip(lesson["words"], archived["words"], strict=True), 1)]
    reader = [{
        "id": f"{PAIR_ID}:reader:{i}",
        "legacySourceRef": f"master-roofing:{N}:passage:{i}",
        "sourceSpanish": es, "sourceEnglish": en,
        "archivedFrenchEvidence": old,
        "conditionalFrench": None if i in READER_HOLDS else old,
        "selectedFrench": None, "audioScript": None,
        "safetyOrMeaningHold": i in READER_HOLDS, "reviewed": False,
    } for i, (es, en, old) in enumerate(zip(
        passage["target"], passage["native"], archived["reading"]["target"], strict=True,
    ), 1)]
    ordered_rows = [[row["sourceSpanish"], row["sourceEnglish"]] for row in cards + reader]
    return {
        "schema": "french-roofing-master4-source-decision-v1",
        "kind": "inert-source-decision", "pair": {"target": "English", "native": "French"},
        "stageId": "master-roofing", "sourceHeaderModuleId": "master-roofing",
        "proposedLessonId": f"master-roofing:{N}", "proposedPairId": PAIR_ID,
        "identityStatus": "proposal-only; no runtime, saved-item, progress or V4 migration",
        "sourceFileSha256": {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in FILES},
        "orderedSourceRowsSha256": hashlib.sha256(json.dumps(ordered_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
        "sourceTitleEnglish": lesson["title"], "sourceObjectiveEnglish": lesson["objective"],
        "sourceFocusEnglish": lesson["grammar"]["focus"], "sourceGrammarExamples": lesson["grammar"]["examples"],
        "sourceLessonType": lesson["lessonType"], "sourceBlock": lesson["block"],
        "sourceSpeakingEnglish": lesson["steps"][2]["instruction"],
        "sourceReaderTitleSpanish": passage["title"], "cards": cards, "reader": reader,
        "sourceVerbExamples": [{
            "spanishInfinitive": v["infinitive"], "englishMeaning": v["native"],
            "sourceSpanish": v["example"]["target"], "sourceEnglish": v["example"]["native"],
        } for v in data["verbs"]],
        "archivedDraft": {
            "titleFrench": archived["titleFrench"], "objectiveFrench": archived["objectiveFrench"],
            "speakingFrenchInstruction": archived["speakingFrenchInstruction"],
            "speakingFrenchOpening": archived["speakingFrenchOpening"],
            "grammarFocusFrench": archived["grammarFocusFrench"],
            "verbExamples": archived["verbs"], "reviewGapsEnglish": archived.get("reviewGapsEnglish", []),
            "status": "separate unapproved draft; no answer, audio or progress inheritance",
        },
        "sourceDecisionQuestions": [{"affectedIds": [f"{PAIR_ID}:{row}" for row in rows], "question": question}
                                    for rows, question in QUESTIONS],
        "selectedDecision": None, "audioScope": None,
        "modeEvidence": "Archive grammar and lesson steps are not six authored prompt/target activity pairs",
        "gates": {key: False for key in (
            "reviewed", "qualifiedFrenchReview", "qualifiedRoofingReview", "qualifiedSourceReview",
            "qualifiedDictionaryReview", "learnerRegistered", "scoringRegistered", "audioRegistered",
            "listeningReviewed", "offlineRegistered", "progressRegistered", "savedItemMapped",
            "browserAccepted", "nativeV4Registered",
        )},
    }


if __name__ == "__main__":
    expected = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.exists() and OUT.read_text() == expected, "Master 4 packet is stale"
        print("PASS French Roofing Master 4 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
