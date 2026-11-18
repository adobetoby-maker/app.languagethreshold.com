#!/usr/bin/env python3
"""Pin Roofing Master 13 source as inert French review evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
OUT = HERE / "packet.json"
N = 13
CURRICULUM = "src/data/master-roofing-curriculum.ts"
LESSON_CONTENT = "public/lesson-content/es/master-roofing.json"
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/master-13-15-draft.json"
FILES = (CURRICULUM, LESSON_CONTENT, ARCHIVE)
PAIR_ID = f"master-roofing:{N}:fr-en"
CARD_HOLDS = set(range(1, 22))
READER_HOLDS = set(range(1, 17))


def source() -> dict:
    code = f"""import {{MASTER_ROOFING_LESSONS}} from './src/data/master-roofing-curriculum.ts'; console.log(JSON.stringify(MASTER_ROOFING_LESSONS[{N - 1}]));"""
    lesson = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    content = json.loads((ROOT / LESSON_CONTENT).read_text())["lessons"][str(N)]
    archive = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == N)
    return {"lesson": lesson, "passage": content["passage"], "verbs": content["verbs"], "archive": archive}


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == N
    assert lesson["title"] == archived["titleEnglish"]
    assert len(lesson["words"]) == len(archived["words"]) == 21
    assert passage["native"] == archived["reading"]["native"]
    assert len(passage["target"]) == len(passage["native"]) == len(archived["reading"]["target"]) == 16
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))
    cards = [{
        "id": f"{PAIR_ID}:card:{i}",
        "legacySourceRef": f"master-roofing:{N}:words:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "sourceNoteSpanish": word.get("note"),
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
        "schema": "french-roofing-master13-source-decision-v1", "kind": "inert-source-decision",
        "pair": {"target": "English", "native": "French"},
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
            "verbExamples": archived["verbs"],
            "reviewGapsEnglish": archived.get("reviewGapsEnglish", []),
            "status": "separate unapproved draft; no answer, audio or progress inheritance",
        },
        "sourceDecisionQuestions": [
            {"affectedIds": [f"{PAIR_ID}:card:1", f"{PAIR_ID}:card:4", f"{PAIR_ID}:card:5", f"{PAIR_ID}:card:6", f"{PAIR_ID}:card:7", f"{PAIR_ID}:reader:3", f"{PAIR_ID}:reader:15", f"{PAIR_ID}:reader:16"], "question": "Preserve the fall, lifeline, roof-anchor, harness and lanyard terms and the source's reported disconnected transition. The archived French changes the probable-cause claim into an unresolved observation. Qualified fall-protection and incident-review decisions must settle the causal wording and approved roof-to-ladder transfer before scored text is selected."},
            {"affectedIds": [f"{PAIR_ID}:card:3", f"{PAIR_ID}:card:9", f"{PAIR_ID}:card:10", f"{PAIR_ID}:card:17", f"{PAIR_ID}:card:18", f"{PAIR_ID}:reader:4", f"{PAIR_ID}:reader:5", f"{PAIR_ID}:reader:6", f"{PAIR_ID}:reader:7", f"{PAIR_ID}:reader:8", f"{PAIR_ID}:reader:9"], "question": "Teach first aid, injured person, paramedics and ankle directly. The source commands 911 and not moving Julio; the archived French substitutes locale-neutral routing and caveated movement. Qualified medical, emergency-response and France/Québec locale review must reconcile exact source meaning without inventing a universal procedure."},
            {"affectedIds": [f"{PAIR_ID}:card:14", f"{PAIR_ID}:card:15", f"{PAIR_ID}:reader:1", f"{PAIR_ID}:reader:2", f"{PAIR_ID}:reader:9", f"{PAIR_ID}:reader:12", f"{PAIR_ID}:reader:13"], "question": "Keep the incident timeline distinct: 10:15 start, about eight feet to grass, paramedics at 10:30, estimated 10:15–10:20 report interval. Archived French changes some exact times to approximate ones and retains feet; choose locale-aware measurement and time language without changing the source evidence."},
            {"affectedIds": [f"{PAIR_ID}:card:2", f"{PAIR_ID}:card:21", f"{PAIR_ID}:reader:10", f"{PAIR_ID}:reader:13", f"{PAIR_ID}:reader:14", f"{PAIR_ID}:reader:15"], "question": "Separate observed incident facts from probable cause and official reporting requirements. The archived French deliberately softens the source's written probable-cause line. Qualified workplace/source review must determine the review-safe incident-report wording and French register."},
        ],
        "selectedDecision": None, "audioScope": None,
        "modeEvidence": "Archive mode labels are not six authored prompt/target activity pairs",
        "gates": {key: False for key in (
            "reviewed", "qualifiedFrenchReview", "qualifiedRoofingReview", "qualifiedSourceReview", "qualifiedDictionaryReview",
            "learnerRegistered", "scoringRegistered", "audioRegistered", "listeningReviewed", "offlineRegistered",
            "progressRegistered", "savedItemMapped", "browserAccepted", "nativeV4Registered",
        )},
    }


if __name__ == "__main__":
    expected = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.exists() and OUT.read_text() == expected, "Master 13 packet is stale"
        print("PASS French Roofing Master 13 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
