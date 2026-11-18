#!/usr/bin/env python3
"""Pin current Core 21 Spanish/English source as inert French review evidence."""
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
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/core-19-21-draft.json"
FILES = (CURRICULUM, WORDS, PASSAGES, VERBS, ARCHIVE)


def source() -> dict:
    code = """const [c,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS[20],passage:p.ROOFING_LESSON_PASSAGES[21]}));"""
    raw = subprocess.check_output(["node", "--experimental-strip-types", "--input-type=module", "-e", code], cwd=ROOT, text=True)
    data = json.loads(raw)
    data["verbs"] = json.loads((ROOT / VERBS).read_text())["lessons"]["21"]["verbs"]
    data["archive"] = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 21)
    return data


def build() -> dict:
    src = source()
    lesson, passage, archived = src["lesson"], src["passage"], src["archive"]
    pair_id = "core-roofing:21:fr-en"
    card_holds = {8, 9, 10, 11, 14}
    reader_holds = {2, 4, 6, 8, 9}
    return {
        "schema": "french-roofing-core21-source-safety-v1",
        "kind": "inert-source-decision",
        "pair": {"target": "French", "native": "English"},
        "stageId": "core-roofing",
        "sourceHeaderModuleId": "roofing",
        "proposedLessonId": "core-roofing:21",
        "proposedPairId": pair_id,
        "identityStatus": "proposal-only; no runtime, saved-item, progress or V4 migration",
        "sourceFileSha256": {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in FILES},
        "sourceTitleEnglish": lesson["title"],
        "sourceObjectiveEnglish": lesson["objective"],
        "sourceSpeakingEnglish": lesson["steps"][2]["instruction"],
        "sourceReaderTitleSpanish": passage["title"],
        "cards": [
            {
                "id": f"{pair_id}:card:{i}",
                "legacySourceRef": f"roofing:21:words:{i}",
                "sourceSpanish": word["es"],
                "sourceEnglish": word["en"],
                "kind": word["kind"],
                "candidateFrench": None,
                "selectedFrench": None,
                "audioScript": None,
                "safetyOrMeaningHold": i in card_holds,
                "reviewed": False,
            }
            for i, word in enumerate(lesson["words"], 1)
        ],
        "reader": [
            {
                "id": f"{pair_id}:reader:{i}",
                "legacySourceRef": f"roofing:21:passage:{i}",
                "sourceSpanish": es,
                "sourceEnglish": en,
                "candidateFrench": None,
                "selectedFrench": None,
                "audioScript": None,
                "safetyOrMeaningHold": i in reader_holds,
                "reviewed": False,
            }
            for i, (es, en) in enumerate(zip(passage["es"], passage["en"], strict=True), 1)
        ],
        "sourceVerbExamples": [
            {"spanishInfinitive": v["infinitive"], "englishMeaning": v["native"], "sourceSpanish": v["example"]["target"], "sourceEnglish": v["example"]["native"]}
            for v in src["verbs"]
        ],
        "archivedDraft": {
            "titleFrench": archived["titleFrench"],
            "objectiveFrench": archived["objectiveFrench"],
            "speakingFrenchInstruction": archived["speakingFrenchInstruction"],
            "wordCount": len(archived["words"]),
            "readerTurnCount": len(archived["reading"]["native"]),
            "archivedSafetyNotesEnglish": [word.get("noteEnglish") for word in archived["words"] if word.get("noteEnglish")],
            "status": "separate unapproved draft; do not inherit answers, audio or progress",
        },
        "sourceDecisionQuestions": [
            {"affectedIds": [f"{pair_id}:card:11"], "question": "The source says a lanyard short enough to prevent ground contact; qualified fall-protection review and source correction must decide whether this is an acceptable teaching claim."},
            {"affectedIds": [f"{pair_id}:card:14", f"{pair_id}:reader:2"], "question": "The source treats wearing a harness as the access condition. A qualified trade review must decide whether the scene states the site-specific protection requirement correctly."},
            {"affectedIds": [f"{pair_id}:card:9", f"{pair_id}:reader:4", f"{pair_id}:reader:6"], "question": "Tie-off, approved anchor and access sequence must use one source-approved meaning; do not score or voice conflicting commands."},
            {"affectedIds": [f"{pair_id}:reader:8", f"{pair_id}:reader:9"], "question": "The source's correct-use and thumbs-up claims need qualified review; an acknowledgement is not silently converted into a verified protection-system check."},
            {"affectedIds": [f"{pair_id}:card:8", f"{pair_id}:card:10"], "question": "Confirm fall-hazard terminology and source `ancla` versus `anclaje` before selecting a French dictionary face."},
        ],
        "selectedDecision": None,
        "audioScope": None,
        "gates": {key: False for key in (
            "reviewed", "qualifiedFrenchReview", "qualifiedRoofingReview", "qualifiedSourceReview", "qualifiedDictionaryReview",
            "learnerRegistered", "scoringRegistered", "audioRegistered", "listeningReviewed", "offlineRegistered",
            "progressRegistered", "savedItemMapped", "browserAccepted", "nativeV4Registered"
        )},
    }


if __name__ == "__main__":
    expected = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.exists() and OUT.read_text() == expected, "Core 21 packet is stale"
        print("PASS French Roofing Core 21 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
