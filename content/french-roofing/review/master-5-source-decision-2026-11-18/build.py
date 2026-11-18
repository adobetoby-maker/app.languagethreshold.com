#!/usr/bin/env python3
"""Pin current Roofing Master 5 source as inert French review evidence."""
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
LESSON_CONTENT = "public/lesson-content/es/master-roofing.json"
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/master-4-6-draft.json"
FILES = (CURRICULUM, LESSON_CONTENT, ARCHIVE)
PAIR_ID = "master-roofing:5:fr-en"
CARD_HOLDS = {1, 3, 4, 5, 6, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21}
READER_HOLDS = {2, 3, 4, 5, 8, 10, 11, 12, 13, 14, 15, 16}


def source() -> dict:
    code = """import {MASTER_ROOFING_LESSONS} from './src/data/master-roofing-curriculum.ts'; console.log(JSON.stringify(MASTER_ROOFING_LESSONS[4]));"""
    data = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    content = json.loads((ROOT / LESSON_CONTENT).read_text())["lessons"]["5"]
    return {
        "lesson": data,
        "passage": content["passage"],
        "verbs": content["verbs"],
        "archive": next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 5),
    }


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == 5
    assert len(lesson["words"]) == len(archived["words"]) == 21
    assert passage["native"] == archived["reading"]["native"]
    assert len(passage["target"]) == len(passage["native"]) == len(archived["reading"]["target"]) == 16
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))

    cards = [
        {
            "id": f"{PAIR_ID}:card:{i}",
            "legacySourceRef": f"master-roofing:5:words:{i}",
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
            "legacySourceRef": f"master-roofing:5:passage:{i}",
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
    ordered_rows = [
        [row["sourceSpanish"], row["sourceEnglish"]] for row in cards + reader
    ]
    return {
        "schema": "french-roofing-master5-source-decision-v1",
        "kind": "inert-source-decision",
        "pair": {"target": "English", "native": "French"},
        "stageId": "master-roofing",
        "sourceHeaderModuleId": "master-roofing",
        "proposedLessonId": "master-roofing:5",
        "proposedPairId": PAIR_ID,
        "identityStatus": "proposal-only; no runtime, saved-item, progress or V4 migration",
        "sourceFileSha256": {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in FILES},
        "orderedSourceRowsSha256": hashlib.sha256(json.dumps(ordered_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
        "sourceTitleEnglish": lesson["title"],
        "sourceObjectiveEnglish": lesson["objective"],
        "sourceFocusEnglish": lesson["grammar"]["focus"],
        "sourceGrammarExamples": lesson["grammar"]["examples"],
        "sourceLessonType": lesson["lessonType"],
        "sourceBlock": lesson["block"],
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
            "reviewGapsEnglish": archived.get("reviewGapsEnglish", []),
            "status": "separate unapproved draft; no answer, audio or progress inheritance",
        },
        "sourceDecisionQuestions": [
            {"affectedIds": [f"{PAIR_ID}:card:1", f"{PAIR_ID}:card:6", f"{PAIR_ID}:reader:2", f"{PAIR_ID}:reader:4", f"{PAIR_ID}:reader:12", f"{PAIR_ID}:reader:14"], "question": 'Source describes soft or rotten structural deck, black and damp wood, a stained rafter and nail-holding concern. Review French deck/plywood/rafter/fastening terminology and distinguish observed damage from an engineering conclusion before selecting instruction.'},
            {"affectedIds": [f"{PAIR_ID}:card:3", f"{PAIR_ID}:card:4", f"{PAIR_ID}:card:5", f"{PAIR_ID}:card:20", f"{PAIR_ID}:reader:10", f"{PAIR_ID}:reader:11", f"{PAIR_ID}:reader:13", f"{PAIR_ID}:reader:15", f"{PAIR_ID}:reader:16"], "question": 'Source requires a written change order and signature before repair. Review locale-specific contract terminology and the sequence of spoken assent versus formal authorization; do not treat the homeowner’s verbal approval alone as a signed change order.'},
            {"affectedIds": [f"{PAIR_ID}:card:14", f"{PAIR_ID}:card:21", f"{PAIR_ID}:reader:3", f"{PAIR_ID}:reader:6", f"{PAIR_ID}:reader:7", f"{PAIR_ID}:reader:10"], "question": 'The source addresses Mr. Ramírez, with informal crew speech in card 21/Reader 3 and polite homeowner speech elsewhere. Archived French makes the crew call formal. Review register, relationship and homeowner-specific noun sense.'},
            {"affectedIds": [f"{PAIR_ID}:card:15", f"{PAIR_ID}:card:16", f"{PAIR_ID}:card:17", f"{PAIR_ID}:card:18", f"{PAIR_ID}:reader:8", f"{PAIR_ID}:reader:12", f"{PAIR_ID}:reader:13"], "question": 'Keep completed tear-off discovery distinct from the pre-existing deck condition and conditional proposal for three plywood sheets, extra cost and one extra day. Author French grammar, forms, speaking and six scored prompt/target modes only after source and domain decisions.'},
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
        assert OUT.exists() and OUT.read_text() == expected, "Master 5 packet is stale"
        print("PASS French Roofing Master 5 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
