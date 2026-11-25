#!/usr/bin/env python3
"""Pin current Roofing Core 11 source as inert French review evidence."""
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
PAIR_ID = "core-roofing:11:fr-en"
CROSSWALK = HERE / "legacy-reference-crosswalk-2026-11-25.json"
REPAIR_BASELINE = "41550e1dfc45bc0abc781b79969d73dd527a1962"
PREVIOUS_PACKET_SHA256 = "8a1c5c95521ee21d88eccf3ace87b64f5af75703325e634ebf0525eb8d034374"
CARD_HOLDS = {1, 2, 3, 8, 9, 13}
READER_HOLDS = {2, 3, 4, 8, 9}


def source() -> dict:
    code = """const n=11;const [c,p,w]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts'),import('./src/data/roofing-lesson-words.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS.find(x=>x.n===n),passage:p.ROOFING_LESSON_PASSAGES[n],words:w.ROOFING_LESSON_WORDS[n]}));"""
    data = json.loads(subprocess.check_output(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
        cwd=ROOT, text=True,
    ))
    data["verbs"] = json.loads((ROOT / VERBS).read_text())["lessons"]["11"]["verbs"]
    data["archive"] = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == 11)
    return data


def build() -> dict:
    data = source()
    lesson, passage, archived = data["lesson"], data["passage"], data["archive"]
    assert lesson["n"] == archived["n"] == 11
    assert lesson["words"] == data["words"], "Curriculum words must equal owning words section 11"
    assert len(lesson["words"]) == len(archived["words"]) == 13
    assert passage["en"] == archived["reading"]["native"]
    assert len(passage["es"]) == len(passage["en"]) == len(archived["reading"]["target"]) == 9
    assert all(word["en"] == old["en"] and word["kind"] == old["kind"]
               for word, old in zip(lesson["words"], archived["words"], strict=True))

    cards = [
        {
            "id": f"{PAIR_ID}:card:{i}",
            "legacySourceRef": f"roofing:{lesson['n']}:words:{i}",
            "legacySourceRefHistory": [{"reference": f"roofing:7:words:{i}", "status": "superseded erroneous provenance; no approved progress mapping"}],
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
            "legacySourceRef": f"roofing:{lesson['n']}:passage:{i}",
            "legacySourceRefHistory": [{"reference": f"roofing:7:passage:{i}", "status": "superseded erroneous provenance; no approved progress mapping"}],
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
        "schema": "french-roofing-core11-source-decision-v1",
        "kind": "inert-source-decision",
        "pair": {"target": "English", "native": "French"},
        "stageId": "core-roofing",
        "sourceHeaderModuleId": "roofing",
        "proposedLessonId": "core-roofing:11",
        "proposedPairId": PAIR_ID,
        "identityStatus": "proposal-only; no runtime, saved-item, progress or V4 migration",
        "legacySourceReferenceRepair": {
            "baseline": REPAIR_BASELINE,
            "previousPacketSha256": PREVIOUS_PACKET_SHA256,
            "crosswalkPath": str(CROSSWALK.relative_to(ROOT)),
            "sourceOwnerSection": 11,
            "scope": "provenance references only; authored text, proposed IDs, order and holds preserved",
            "savedItemMappingApproved": False,
            "progressImportApproved": False,
            "runtimeIdentityChanged": False,
        },
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
            {"affectedIds": [f"{PAIR_ID}:card:1", f"{PAIR_ID}:card:9", f"{PAIR_ID}:reader:3", f"{PAIR_ID}:reader:4"], "question": "The source uses a chalk line (línea de tiza) and describes workers stretching and snapping it. Archived cordeau traceur may not explicitly distinguish chalk from another line-marking system. Confirm French trade and regional sense before scored/audio use."},
            {"affectedIds": [f"{PAIR_ID}:card:2", f"{PAIR_ID}:card:3", f"{PAIR_ID}:card:13", f"{PAIR_ID}:reader:8"], "question": "First course and starter strip are distinct source concepts. Archived premier rang and bande de départ must be checked against the approved roof product and regional terminology; do not collapse the strip into a generic first row."},
            {"affectedIds": [f"{PAIR_ID}:reader:2", f"{PAIR_ID}:card:8", f"{PAIR_ID}:reader:9"], "question": "The foreman marks points on the plan and the overhang measurement is on the job plan. Confirm whether the intended points are physical marks on a drawing or site layout marks made according to it; do not invent a numeric overhang or universal placement dimension."},
            {"affectedIds": [f"{PAIR_ID}:card:8", f"{PAIR_ID}:reader:9"], "question": "Source overhang is roof eave projection in this job plan; archived débord may be broader. Confirm the French dictionary sense and the approved plan/product detail before using as an installation command."},
            {"affectedIds": [f"{PAIR_ID}:card:9", f"{PAIR_ID}:reader:3", f"{PAIR_ID}:reader:8"], "question": "Source speaking asks only to show a worker where to run the first-course chalk line. Archived speaking adds the overhang measurement and approved product method. Keep extra process questions separate from this direct learner objective."},
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


def crosswalk(packet: dict, packet_text: str) -> dict:
    rows = []
    for group, owner in (("cards", WORDS), ("reader", PASSAGES)):
        for position, row in enumerate(packet[group], 1):
            rows.append({
                "packetRowId": row["id"],
                "previousLegacySourceRef": row["legacySourceRefHistory"][0]["reference"],
                "repairedLegacySourceRef": row["legacySourceRef"],
                "owningSourcePath": owner,
                "owningSection": 11,
                "sourcePosition": position,
                "sourceSpanish": row["sourceSpanish"],
                "sourceEnglish": row["sourceEnglish"],
                "sourceContentSha256": hashlib.sha256(json.dumps(
                    [row["sourceSpanish"], row["sourceEnglish"]],
                    ensure_ascii=False, separators=(",", ":"),
                ).encode()).hexdigest(),
            })
    return {
        "schema": "french-roofing-core11-legacy-reference-repair-v1",
        "baseline": REPAIR_BASELINE,
        "packetPath": str(OUT.relative_to(ROOT)),
        "previousPacketSha256": PREVIOUS_PACKET_SHA256,
        "repairedPacketSha256": hashlib.sha256(packet_text.encode()).hexdigest(),
        "sourceFileSha256": packet["sourceFileSha256"],
        "orderedSourceRowsSha256": packet["orderedSourceRowsSha256"],
        "rows": rows,
        "savedItemMappingApproved": False,
        "progressImportApproved": False,
        "registered": False,
        "reviewed": False,
        "scope": "Historical provenance crosswalk only; no learner, saved-item or progress migration",
    }


if __name__ == "__main__":
    packet = build()
    expected = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
    expected_crosswalk = json.dumps(crosswalk(packet, expected), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.exists() and OUT.read_text() == expected, "Core 11 packet is stale"
        assert CROSSWALK.exists() and CROSSWALK.read_text() == expected_crosswalk, "Core 11 provenance crosswalk is stale"
        print("PASS French Roofing Core 11 packet and provenance crosswalk build --check")
    else:
        OUT.write_text(expected)
        CROSSWALK.write_text(expected_crosswalk)
        print(f"Wrote {OUT.relative_to(ROOT)} and {CROSSWALK.relative_to(ROOT)}")
