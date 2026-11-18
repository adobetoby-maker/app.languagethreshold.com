#!/usr/bin/env python3
"""Pin Roofing Master 7 source as inert French review evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
OUT = HERE / "packet.json"
N = 7
CURRICULUM = "src/data/master-roofing-curriculum.ts"
LESSON_CONTENT = "public/lesson-content/es/master-roofing.json"
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/master-7-9-draft.json"
FILES = (CURRICULUM, LESSON_CONTENT, ARCHIVE)
PAIR_ID = f"master-roofing:{N}:fr-en"
CARD_HOLDS = {1, 2, 4, 5, 6, 8, 9, 11, 12, 14, 16, 17, 21}
READER_HOLDS = {2, 3, 4, 5, 8, 9, 10, 13, 14, 15, 16}


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
        "schema": "french-roofing-master7-source-decision-v1", "kind": "inert-source-decision",
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
            {"affectedIds": [f"{PAIR_ID}:card:1", f"{PAIR_ID}:card:2", f"{PAIR_ID}:card:6", f"{PAIR_ID}:reader:2", f"{PAIR_ID}:reader:14", f"{PAIR_ID}:reader:16"], "question": "Determine the exact France/Québec insurance-adjuster, insurer, claim and scope terms. The fictional adjuster's report and insurer communication do not establish approval or payment of a claim."},
            {"affectedIds": [f"{PAIR_ID}:card:4", f"{PAIR_ID}:card:5", f"{PAIR_ID}:card:8", f"{PAIR_ID}:card:14", f"{PAIR_ID}:reader:5", f"{PAIR_ID}:reader:8", f"{PAIR_ID}:reader:13"], "question": "Review hail impact, granule-loss and 10-by-10-foot test-square language. Preserve source counts and square-foot measurements without asserting an insurer's universal inspection or attribution standard."},
            {"affectedIds": [f"{PAIR_ID}:card:11", f"{PAIR_ID}:card:12", f"{PAIR_ID}:reader:3", f"{PAIR_ID}:reader:4", f"{PAIR_ID}:reader:14", f"{PAIR_ID}:reader:15"], "question": "Confirm roofing sense of roof slope/face, gutter damage and full replacement versus repair. Roof access with the adjuster and scope agreement need trade/safety/insurance review; the source is a roleplay, not jobsite authorization."},
            {"affectedIds": [f"{PAIR_ID}:card:16", f"{PAIR_ID}:card:17", f"{PAIR_ID}:reader:9", f"{PAIR_ID}:reader:10"], "question": "Keep the 12 west-side versus three north-side counts and the source's stated west-wind explanation. Check whether archived French loses the test-square scope or presents the attribution as verified fact."},
            {"affectedIds": [f"{PAIR_ID}:card:21", f"{PAIR_ID}:reader:15", f"{PAIR_ID}:reader:16"], "question": "Author French narration/number practice and six prompt/target mode pairs for the adjuster conversation. Archived mode descriptions and speaking text are only evidence, not selected learner activities."},
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
        assert OUT.exists() and OUT.read_text() == expected, "Master 7 packet is stale"
        print("PASS French Roofing Master 7 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
