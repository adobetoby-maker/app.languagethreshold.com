#!/usr/bin/env python3
"""Pin current Roofing Core 12 source as inert French review evidence."""
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
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/core-10-12-draft.json"
FILES = (CURRICULUM, WORDS, PASSAGES, VERBS, ARCHIVE)
PAIR_ID = "core-roofing:12:fr-en"
CARD_HOLDS = {4, 8, 10, 13}
READER_HOLDS = {4, 7}


def source() -> dict:
    code = """const [c,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS[11],passage:p.ROOFING_LESSON_PASSAGES[12]}));"""
    data = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    data["verbs"] = json.loads((ROOT / VERBS).read_text())["lessons"]["12"]["verbs"]
    data["archive"] = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 12)
    return data


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == 12
    assert len(lesson["words"]) == len(archived["words"]) == 14
    assert passage["en"] == archived["reading"]["native"]
    assert len(passage["es"]) == len(passage["en"]) == len(archived["reading"]["target"]) == 8
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))

    cards = [
        {
            "id": f"{PAIR_ID}:card:{i}",
            "legacySourceRef": f"roofing:12:words:{i}",
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
            "legacySourceRef": f"roofing:12:passage:{i}",
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
            passage["es"], passage["en"], archived["reading"]["target"], strict=True,
        ), 1)
    ]
    ordered_rows = [
        [row["sourceSpanish"], row["sourceEnglish"]] for row in cards + reader
    ]
    return {
        "schema": "french-roofing-core12-source-decision-v1",
        "kind": "inert-source-decision",
        "pair": {"target": "English", "native": "French"},
        "stageId": "core-roofing",
        "sourceHeaderModuleId": "roofing",
        "proposedLessonId": "core-roofing:12",
        "proposedPairId": PAIR_ID,
        "identityStatus": "proposal-only; no runtime, saved-item, progress or V4 migration",
        "sourceFileSha256": {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in FILES},
        "orderedSourceRowsSha256": hashlib.sha256(json.dumps(ordered_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
        "sourceTitleEnglish": lesson["title"],
        "sourceObjectiveEnglish": lesson["objective"],
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
            "regionalNotesEnglish": archived.get("regionalNotesEnglish", []),
            "status": "separate unapproved draft; no answer, audio or progress inheritance",
        },
        "sourceDecisionQuestions": [
            {"affectedIds": [f"{PAIR_ID}:card:4", f"{PAIR_ID}:reader:1"], "question": "The source explicitly specifies asphalt shingles. Archived card bardeau omits asphalt while Reader includes bardeaux d’asphalte; choose a consistent regional material term before scored cards and speech."},
            {"affectedIds": [f"{PAIR_ID}:card:10", f"{PAIR_ID}:reader:4"], "question": "Six inches is quoted as the guide's example, not a universal installation specification. The card is a bare imperative; ensure its context, audio and six authored modes cannot present it as the actual job requirement."},
            {"affectedIds": [f"{PAIR_ID}:card:8", f"{PAIR_ID}:card:13", f"{PAIR_ID}:reader:7"], "question": "Confirm the job specification with the lead/office before work. Archived spécification/chantier and contremaître need regional trade/register review; distinguish actual approved job or manufacturer requirement from the guide example."},
            {"affectedIds": [f"{PAIR_ID}:card:2", f"{PAIR_ID}:card:10", f"{PAIR_ID}:card:12", f"{PAIR_ID}:reader:4", f"{PAIR_ID}:reader:6"], "question": "Keep stagger as the joint-offset action and the job-specific offset measure, not a generic pattern name. Align noun/verb forms and measurement units across cards, Reader, speaking and modes."},
            {"affectedIds": [f"{PAIR_ID}:card:3", f"{PAIR_ID}:card:14", f"{PAIR_ID}:reader:1", f"{PAIR_ID}:reader:8"], "question": "The source roofing course is a row of shingles. Verify regional French rang/rangée and starter-course usage for this material; do not silently treat a first course as a general roof tier."},
            {"affectedIds": [f"{PAIR_ID}:card:10", f"{PAIR_ID}:card:13", f"{PAIR_ID}:reader:4", f"{PAIR_ID}:reader:7"], "question": "Source speaking asks for the guide's six-inch phrase followed by confirmation from the lead. Archived speaking adds manufacturer instructions; keep this as a separate domain note unless qualified source review approves its place in the lesson."},
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
        assert OUT.exists() and OUT.read_text() == expected, "Core 12 packet is stale"
        print("PASS French Roofing Core 12 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
