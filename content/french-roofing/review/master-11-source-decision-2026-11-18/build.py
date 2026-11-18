#!/usr/bin/env python3
"""Pin Roofing Master 11 source as inert French review evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
OUT = HERE / "packet.json"
N = 11
CURRICULUM = "src/data/master-roofing-curriculum.ts"
LESSON_CONTENT = "public/lesson-content/es/master-roofing.json"
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/master-10-12-draft.json"
FILES = (CURRICULUM, LESSON_CONTENT, ARCHIVE)
PAIR_ID = f"master-roofing:{N}:fr-en"
CARD_HOLDS = {2, 3, 7, 9, 16, 18, 19, 20, 21, 22}
READER_HOLDS = {1, 2, 5, 6, 8, 10, 11, 12, 13, 14, 15, 16}


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
    assert len(lesson["words"]) == len(archived["words"]) == 22
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
        "schema": "french-roofing-master11-source-decision-v1", "kind": "inert-source-decision",
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
            {"affectedIds": [f"{PAIR_ID}:card:2", f"{PAIR_ID}:card:3", f"{PAIR_ID}:card:18", f"{PAIR_ID}:reader:1", f"{PAIR_ID}:reader:2"], "question": 'Review heat exhaustion versus heatstroke wording, symptom severity and the urgent response. Keep clinical vocabulary direct and obtain qualified medical and occupational heat-safety review before a scored answer.'},
            {"affectedIds": [f"{PAIR_ID}:card:7", f"{PAIR_ID}:card:9", f"{PAIR_ID}:card:16", f"{PAIR_ID}:reader:5", f"{PAIR_ID}:reader:6", f"{PAIR_ID}:reader:8", f"{PAIR_ID}:reader:10"], "question": 'Resolve exact source meaning for the six-to-two schedule, hourly shaded water breaks and electrolytes. The Spanish source does not provide a complete site-specific heat prevention plan.'},
            {"affectedIds": [f"{PAIR_ID}:card:19", f"{PAIR_ID}:card:20", f"{PAIR_ID}:reader:11", f"{PAIR_ID}:reader:12", f"{PAIR_ID}:reader:13"], "question": 'The source says more than 100 degrees without naming a temperature scale. Archived French supplies Fahrenheit. Require a source and locale decision before selecting that unit.'},
            {"affectedIds": [f"{PAIR_ID}:card:21", f"{PAIR_ID}:reader:14", f"{PAIR_ID}:reader:15"], "question": 'The source uses 911. Preserve the source context, and require locale review before presenting an emergency number as general French-language advice.'},
            {"affectedIds": [f"{PAIR_ID}:card:22", f"{PAIR_ID}:reader:16"], "question": 'Review the Friday promise and motivational wording against the source while retaining the explicit no-risk safety condition. Author separate French speaking and six mode prompt/target pairs.'},
        ],
        "selectedDecision": None, "audioScope": None,
        "modeEvidence": "Archive mode labels are not six authored prompt/target activity pairs",
        "gates": {key: False for key in (
            "reviewed", "qualifiedFrenchReview", "qualifiedClinicalReview", "qualifiedLocaleReview", "qualifiedRoofingReview", "qualifiedSourceReview", "qualifiedDictionaryReview",
            "learnerRegistered", "scoringRegistered", "audioRegistered", "listeningReviewed", "offlineRegistered",
            "progressRegistered", "savedItemMapped", "browserAccepted", "nativeV4Registered",
        )},
    }


if __name__ == "__main__":
    expected = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.exists() and OUT.read_text() == expected, "Master 11 packet is stale"
        print("PASS French Roofing Master 11 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
