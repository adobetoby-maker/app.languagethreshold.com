#!/usr/bin/env python3
"""Pin current Roofing Master 6 source as inert French review evidence."""
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
PAIR_ID = "master-roofing:6:fr-en"
CARD_HOLDS = {4, 5, 6, 10, 11, 15, 17, 18, 19, 20, 21}
READER_HOLDS = {2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17}


def source() -> dict:
    code = """import {MASTER_ROOFING_LESSONS} from './src/data/master-roofing-curriculum.ts'; console.log(JSON.stringify(MASTER_ROOFING_LESSONS[5]));"""
    data = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    content = json.loads((ROOT / LESSON_CONTENT).read_text())["lessons"]["6"]
    return {
        "lesson": data,
        "passage": content["passage"],
        "verbs": content["verbs"],
        "archive": next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 6),
    }


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == 6
    assert len(lesson["words"]) == len(archived["words"]) == 21
    assert passage["native"] == archived["reading"]["native"]
    assert len(passage["target"]) == len(passage["native"]) == len(archived["reading"]["target"]) == 17
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))

    cards = [
        {
            "id": f"{PAIR_ID}:card:{i}",
            "legacySourceRef": f"master-roofing:6:words:{i}",
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
            "legacySourceRef": f"master-roofing:6:passage:{i}",
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
        "schema": "french-roofing-master6-source-decision-v1",
        "kind": "inert-source-decision",
        "pair": {"target": "English", "native": "French"},
        "stageId": "master-roofing",
        "sourceHeaderModuleId": "master-roofing",
        "proposedLessonId": "master-roofing:6",
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
            {"affectedIds": [f"{PAIR_ID}:card:10", f"{PAIR_ID}:card:11", f"{PAIR_ID}:card:18", f"{PAIR_ID}:reader:6", f"{PAIR_ID}:reader:7", f"{PAIR_ID}:reader:8", f"{PAIR_ID}:reader:9"], "question": 'Source compares same architectural shingle from another brand with a three-tab product excluded by the contract and asserts equivalent durability with greater weight. Archived French changes card 18 into a supplier-attributed claim and Reader 6 to the same type. Review product equivalence, load, technical sheet, French product senses and the limits of a supplier claim before selecting scored text.'},
            {"affectedIds": [f"{PAIR_ID}:card:4", f"{PAIR_ID}:card:19", f"{PAIR_ID}:card:20", f"{PAIR_ID}:reader:10", f"{PAIR_ID}:reader:11", f"{PAIR_ID}:reader:12", f"{PAIR_ID}:reader:13"], "question": 'Preserve Mrs. Díaz as the female homeowner, comparison with other available colors, the photo, her conditional approval and text-message approval. Archived Reader 5/9 masculinizes the customer and Reader 12 changes source future delivery to a possibility; reconcile the factual sequence without silently substituting a different condition.'},
            {"affectedIds": [f"{PAIR_ID}:card:15", f"{PAIR_ID}:card:17", f"{PAIR_ID}:reader:2", f"{PAIR_ID}:reader:4", f"{PAIR_ID}:reader:5", f"{PAIR_ID}:reader:15", f"{PAIR_ID}:reader:16"], "question": 'Source order is incomplete because the color is out of stock; factory Thursday arrival is uncertain, while the alternative is planned for next-day delivery after approval. Review future versus near-future French and the four-day delay, pallet, underlayment and drip-edge terms.'},
            {"affectedIds": [f"{PAIR_ID}:card:21", f"{PAIR_ID}:reader:17"], "question": 'The source uses informal crew speech to Kevin after a formal supplier/customer conversation. Confirm French register and six authored activities and speaking aligned to supplier inquiry and revised crew plan before selecting a scored answer.'},
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
        assert OUT.exists() and OUT.read_text() == expected, "Master 6 packet is stale"
        print("PASS French Roofing Master 6 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
