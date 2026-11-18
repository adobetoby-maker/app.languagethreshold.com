#!/usr/bin/env python3
"""Pin current Roofing Core 7 source as inert French review evidence."""
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
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/core-7-9-draft.json"
FILES = (CURRICULUM, WORDS, PASSAGES, VERBS, ARCHIVE)
PAIR_ID = "core-roofing:7:fr-en"
CARD_HOLDS = {2, 3, 4, 10, 11, 12, 13}
READER_HOLDS = {3, 4, 5, 7}


def source() -> dict:
    code = """const [c,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS[6],passage:p.ROOFING_LESSON_PASSAGES[7]}));"""
    data = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    data["verbs"] = json.loads((ROOT / VERBS).read_text())["lessons"]["7"]["verbs"]
    data["archive"] = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 7)
    return data


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == 7
    assert len(lesson["words"]) == len(archived["words"]) == 15
    assert passage["en"] == archived["reading"]["native"]
    assert len(passage["es"]) == len(passage["en"]) == len(archived["reading"]["target"]) == 9
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))

    cards = [
        {
            "id": f"{PAIR_ID}:card:{i}",
            "legacySourceRef": f"roofing:7:words:{i}",
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
            "legacySourceRef": f"roofing:7:passage:{i}",
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
        "schema": "french-roofing-core7-source-decision-v1",
        "kind": "inert-source-decision",
        "pair": {"target": "English", "native": "French"},
        "stageId": "core-roofing",
        "sourceHeaderModuleId": "roofing",
        "proposedLessonId": "core-roofing:7",
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
            {"affectedIds": [f"{PAIR_ID}:card:2", f"{PAIR_ID}:card:11", f"{PAIR_ID}:reader:7"], "question": "The source explicitly names asphalt shingles in Spanish and generic shingles in English. Archived French bardeaux omits asphalt. Decide whether the material specificity must carry through cards, Reader and disposal instruction."},
            {"affectedIds": [f"{PAIR_ID}:card:3", f"{PAIR_ID}:card:10", f"{PAIR_ID}:reader:3"], "question": "Deck is the structural roof deck in this tear-off scope. Archived support de couverture may imply a more general support; choose a consistent French trade term before giving the remove-to-deck command."},
            {"affectedIds": [f"{PAIR_ID}:card:4", f"{PAIR_ID}:card:10"], "question": "Old roof is broad; archived ancienne couverture may narrow to covering layers. Decide whether it includes retained roof elements, and align the objective with the current source rather than a universal tear-off procedure."},
            {"affectedIds": [f"{PAIR_ID}:card:12", f"{PAIR_ID}:card:13", f"{PAIR_ID}:reader:4", f"{PAIR_ID}:reader:5"], "question": "The source scene orders all layers, underlayment and flashing removed. This is a fictional job scope, not a universal instruction; qualify the actual approved scope, elements to retain and site safety plan before selecting scored French commands."},
            {"affectedIds": [f"{PAIR_ID}:card:10", f"{PAIR_ID}:reader:3", f"{PAIR_ID}:reader:4", f"{PAIR_ID}:reader:5"], "question": "Archived French says toute la couverture, potentially narrowing source everything down to the deck. Resolve the precise scope across card, Reader, speaking command and six authored modes together."},
            {"affectedIds": [f"{PAIR_ID}:card:14", f"{PAIR_ID}:card:15", f"{PAIR_ID}:reader:8", f"{PAIR_ID}:reader:9"], "question": "Source speaking requires the command and confirmation; archived speaking instead asks the crew to describe a job-specific approved scope and what remains. Preserve the two asks separately until source/roofing review resolves the scene."},
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
        assert OUT.exists() and OUT.read_text() == expected, "Core 7 packet is stale"
        print("PASS French Roofing Core 7 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
