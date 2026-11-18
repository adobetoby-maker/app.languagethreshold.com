#!/usr/bin/env python3
"""Build the inert Master 7 Reader source decision packet."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).with_name("packet.json")
READER = "public/lesson-content/es/master-construction-foreman.json"
CURRICULUM = "src/data/core60/es/master-construction-foreman.json"
DRAFT = "content/japanese-construction-foreman/master-translation-7-9-draft.json"
OLD_COMMIT = "d13f46af8bf872742859ea60e582475505fde838"
OLD_READER = "content/japanese-construction-foreman/master-original-reader-7-9-draft.json"


def source(path, revision="HEAD"):
    raw = subprocess.check_output(["git", "show", f"{revision}:{path}"], cwd=ROOT)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def build():
    reader, reader_hash = source(READER)
    curriculum, curriculum_hash = source(CURRICULUM)
    draft, draft_hash = source(DRAFT)
    historical, historical_hash = source(OLD_READER, OLD_COMMIT)
    lesson = curriculum["lessons"][6]
    assert lesson["n"] == draft["lessons"][0]["n"] == 7
    passage = reader["lessons"]["7"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    terms = {term["en"]: term["ja"] for term in draft["lessons"][0]["terms"]}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = terms.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:7:reader:line:{n}",
            "sourceSpanish": es,
            "sourceEnglish": en,
            "speaker": speaker if separator else None,
            "conditionalJapanesePhrase": candidate,
            "conditionalPhraseFromExactTermDraft": bool(candidate),
            "selectedJapanese": None,
            "qualifiedReview": False,
        })
    old = next(item for item in historical["lessons"] if item["n"] == 7)
    old_rows = [{"japanese": s["target"], "english": s["native"]} for s in old["sentences"]]
    assert len(old_rows) == 8
    return {
        "schema": 1,
        "state": "source-only-reader-gap-review",
        "target": "Japanese",
        "native": "English",
        "stage": "master",
        "lesson": 7,
        "moduleId": "master-construction-foreman-ja-en",
        "source": {
            "readerPath": READER,
            "curriculumPath": CURRICULUM,
            "translationDraftPath": DRAFT,
            "readerSHA256": reader_hash,
            "curriculumSHA256": curriculum_hash,
            "translationDraftSHA256": draft_hash,
            "sourceReaderTitleSpanish": passage["title"],
            "sourceLessonTitleEnglish": lesson["title"],
            "sourceObjectiveEnglish": lesson["objective"],
        },
        "historicalPrivateReader": {
            "commitSHA": OLD_COMMIT,
            "path": OLD_READER,
            "sha256": historical_hash,
            "title": old["title"],
            "rows": old_rows,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–10",
                "question": "Preserve Monday 8:00 at La Fogata, adjuster Silvia Navarro, foreman Roberto Díaz, the company's policy number, Saturday coupling failure above the kitchen door, Sunday guard discovery and 6:10 shutoff, 6:15 call, guard report and 7:30 photos. A qualified Japanese/insurance reviewer must settle adjuster, claim, policy and incident-report terms without implying a claim decision.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 11–15",
                "question": "Preserve the stated 600 square feet, power shutoff report, two industrial vacuums before 10:00 Sunday, 24 drywall sheets, nine tile boxes and three still-wet wall bottoms. Attribute actions and measurements to Roberto; a qualified construction/moisture reviewer must settle drywall, tile, standing-water and moisture-meter senses and source units. This is incident narration, not an independent electrical or water-removal procedure.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 16–18",
                "question": "Preserve Roberto's report of two dehumidifiers and his stated mold-prevention purpose, his invoice question, and Silvia's request for invoices today plus photos and report added to the claim. A qualified Japanese/moisture/insurance reviewer must choose exact dehumidifier, mold and invoice language without presenting the character's prevention claim as verified outcome.",
                "qualifiedDecision": None,
            },
        ],
        "rows": rows,
        "reviewGates": {key: False for key in (
            "qualifiedJapaneseReview", "qualifiedConstructionReview", "sourceTechnicalQuestionsResolved",
            "sourceParity", "dictionarySenses", "sixAuthoredModes", "forms", "speaking",
            "audioText", "audioListening", "savedItemMigration", "learnerRuntime", "offline",
            "progress", "v4Native", "qualifiedInsuranceReview", "qualifiedMoistureReview",
        )},
    }


if __name__ == "__main__":
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if sys.argv[1:] == ["--check"]:
        assert OUT.read_text() == rendered, "packet.json differs from deterministic source build"
        print("PASS Japanese Foreman Master 7 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
