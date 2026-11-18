#!/usr/bin/env python3
"""Pin current Roofing Core 18 source as inert French review evidence."""
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
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/core-16-18-draft.json"
FILES = (CURRICULUM, WORDS, PASSAGES, VERBS, ARCHIVE)
PAIR_ID = "core-roofing:18:fr-en"
CARD_HOLDS = {1, 2, 3, 8, 9, 10, 12, 13, 14, 15}
READER_HOLDS = {2, 3, 4, 5, 6, 7, 8, 9}


def source() -> dict:
    code = """const [c,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS[17],passage:p.ROOFING_LESSON_PASSAGES[18]}));"""
    data = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    data["verbs"] = json.loads((ROOT / VERBS).read_text())["lessons"]["18"]["verbs"]
    data["archive"] = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 18)
    return data


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == 18
    assert len(lesson["words"]) == len(archived["words"]) == 15
    assert passage["en"] == archived["reading"]["native"]
    assert len(passage["es"]) == len(passage["en"]) == len(archived["reading"]["target"]) == 9
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))

    cards = [
        {
            "id": f"{PAIR_ID}:card:{i}",
            "legacySourceRef": f"roofing:18:words:{i}",
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
            "legacySourceRef": f"roofing:18:passage:{i}",
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
        "schema": "french-roofing-core18-source-decision-v1",
        "kind": "inert-source-decision",
        "pair": {"target": "English", "native": "French"},
        "stageId": "core-roofing",
        "sourceHeaderModuleId": "roofing",
        "proposedLessonId": "core-roofing:18",
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
            {"affectedIds": [f"{PAIR_ID}:card:1", f"{PAIR_ID}:reader:2", f"{PAIR_ID}:reader:3"], "question": "Overdriven nail describes excessive fastener penetration; French clou trop enfoncé is plausible but must preserve the observable depth condition. Confirm the diagnostic criterion and dictionary sense with the approved shingle system."},
            {"affectedIds": [f"{PAIR_ID}:card:2", f"{PAIR_ID}:reader:9"], "question": "Spanish teja asfáltica is an asphalt shingle. Archived French bardeau alone may name another product; select a contextual asphalt-shingle term before scoring the depth check."},
            {"affectedIds": [f"{PAIR_ID}:card:3", f"{PAIR_ID}:card:8", f"{PAIR_ID}:card:9", f"{PAIR_ID}:reader:5"], "question": "Confirm nail gun/cloueuse, hose/tuyau and adjust/régler terms for the specific pneumatic tool; source Reader 5 checks compressor and hose, but does not prescribe any setting."},
            {"affectedIds": [f"{PAIR_ID}:card:10", f"{PAIR_ID}:card:13", f"{PAIR_ID}:reader:4"], "question": "The source says do not over-drive nails and that the head must sit flush. Confirm approved fastening depth/nailing-zone wording; 'flush' alone is not a universal fastener specification."},
            {"affectedIds": [f"{PAIR_ID}:card:12", f"{PAIR_ID}:card:15", f"{PAIR_ID}:reader:6", f"{PAIR_ID}:reader:7"], "question": "The source commands lowering air pressure and adjusting the nail gun. These are source dialogue, not a universal tool setting; qualified tool/product review must establish the applicable method before scored commands or audio."},
            {"affectedIds": [f"{PAIR_ID}:card:14", f"{PAIR_ID}:reader:8", f"{PAIR_ID}:reader:9"], "question": "The source says put a new nail next to an overdriven one and check depth on a few shingles. This may conflict with manufacturer repair/nailing pattern requirements; hold as a quoted scene, not an approved repair instruction."},
            {"affectedIds": [f"{PAIR_ID}:reader:3", f"{PAIR_ID}:reader:6", f"{PAIR_ID}:reader:7"], "question": "Archived French speaking asks for a qualified person and manufacturer method, whereas the exact source objective asks the learner to stop installation and request an adjustment. Resolve how to preserve the source objective without suggesting an unapproved adjustment or repair."},
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
        assert OUT.exists() and OUT.read_text() == expected, "Core 18 packet is stale"
        print("PASS French Roofing Core 18 packet build --check")
    else:
        OUT.write_text(expected)
        print(f"Wrote {OUT.relative_to(ROOT)}")
