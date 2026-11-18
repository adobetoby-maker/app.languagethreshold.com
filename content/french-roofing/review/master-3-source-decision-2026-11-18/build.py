#!/usr/bin/env python3
"""Pin current Roofing Master 3 source as inert French review evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
OUT = HERE / "packet.json"
N = 3
PAIR_ID = f"master-roofing:{N}:fr-en"
CURRICULUM = "src/data/master-roofing-curriculum.ts"
LESSON_CONTENT = "public/lesson-content/es/master-roofing.json"
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/master-1-3-draft.json"
FILES = (CURRICULUM, LESSON_CONTENT, ARCHIVE)
CARD_HOLDS = {2, 3, 4, 5, 7, 9, 11, 12, 14, 15, 16, 17, 20}
READER_HOLDS = {2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16}
QUESTIONS = [
    (["card:2", "card:3", "reader:3", "reader:4"],
     "The source locates a nailing zone on this shingle and requires the manufacturer's pattern. Confirm the product-specific nailing-zone and pattern terminology before selecting French commands."),
    (["card:4", "card:5", "card:12", "reader:5", "reader:6", "reader:8", "reader:9", "reader:10"],
     "High and overdriven nails are distinct defects. The archived French softens the source's claim that an overdriven nail cuts the shingle and wind can lift it; resolve source fidelity and product scope before scoring."),
    (["card:7", "card:9", "card:11", "card:14", "card:15", "card:16", "card:17", "reader:2", "reader:7", "reader:11", "reader:12", "reader:14"],
     "Nail-gun trigger, hose, compressor pressure, depth, replacement and hole-sealing instructions need qualified tool/product safety review. The source ties sealing to product instructions; avoid a universal repair rule."),
    (["card:20", "reader:16"],
     "The final instruction addresses an experienced older new hire politely. Check the French vous/register choice against the source role relationship and surrounding informal Kevin dialogue."),
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
    assert len(lesson["words"]) == len(archived["words"]) == 20
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
        "schema": "french-roofing-master3-source-decision-v1",
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
        assert OUT.exists() and OUT.read_text() == expected, "Master 3 packet is stale"
        print("PASS French Roofing Master 3 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
