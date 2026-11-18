#!/usr/bin/env python3
"""Build the inert Master 9 Reader source decision packet."""

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
    lesson = curriculum["lessons"][8]
    assert lesson["n"] == draft["lessons"][2]["n"] == 9
    passage = reader["lessons"]["9"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    terms = {term["en"]: term["ja"] for term in draft["lessons"][2]["terms"]}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = terms.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:9:reader:line:{n}",
            "sourceSpanish": es,
            "sourceEnglish": en,
            "speaker": speaker if separator else None,
            "conditionalJapanesePhrase": candidate,
            "conditionalPhraseFromExactTermDraft": bool(candidate),
            "selectedJapanese": None,
            "qualifiedReview": False,
        })
    old = next(item for item in historical["lessons"] if item["n"] == 9)
    old_rows = [{"japanese": s["target"], "english": s["native"]} for s in old["sentences"]]
    assert len(old_rows) == 8
    return {
        "schema": 1,
        "state": "source-only-reader-gap-review",
        "target": "Japanese",
        "native": "English",
        "stage": "master",
        "lesson": 9,
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
                "sourceLocation": "Reader 1–8",
                "question": "Preserve the retail strip on Avenida Central, foreman Daniel Ortiz, master mason Rogelio Durán, helper Kevin Soto, and the corner leaning outward almost 1 inch out of plumb. Rogelio blames Kevin for not raising the line in time; Daniel assigns wall responsibility to Rogelio while acknowledging his work. A qualified Japanese/masonry reviewer must settle plumb bob, straightedge, level, out-of-plumb and workmanship terms and keep the personnel and attribution exact.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 9–15",
                "question": "Preserve Daniel's request to take down the section before the mortar hardens, Rogelio removing block from the last four courses while the mortar is fresh, checking plumb on every course, and Kevin working alongside Rogelio and alerting Daniel to deviations. A qualified Japanese/masonry reviewer must settle course, mortar, trowel, line and block terminology and keep the narrated correction distinct from independent construction advice.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 16–18",
                "question": "Preserve Daniel's plan for tomorrow, his request to see the corner before lunch, and Rogelio's specific agreement to check it together at 11 with straightedge and plumb bob. A qualified Japanese/source reviewer must retain the exact time and distinguish the request from a completed inspection; inspect conditional draft register before any learner or audio use.",
                "qualifiedDecision": None,
            },
        ],
        "rows": rows,
        "reviewGates": {key: False for key in (
            "qualifiedJapaneseReview", "qualifiedConstructionReview", "sourceTechnicalQuestionsResolved",
            "sourceParity", "dictionarySenses", "sixAuthoredModes", "forms", "speaking",
            "audioText", "audioListening", "savedItemMigration", "learnerRuntime", "offline",
            "progress", "v4Native", "qualifiedMasonryReview", "qualifiedWorkplaceFeedbackReview",
        )},
    }


if __name__ == "__main__":
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if sys.argv[1:] == ["--check"]:
        assert OUT.read_text() == rendered, "packet.json differs from deterministic source build"
        print("PASS Japanese Foreman Master 9 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
