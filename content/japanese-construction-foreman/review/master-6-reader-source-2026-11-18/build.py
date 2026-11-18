#!/usr/bin/env python3
"""Build the inert Master 6 Reader source decision packet."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).with_name("packet.json")
READER = "public/lesson-content/es/master-construction-foreman.json"
CURRICULUM = "src/data/core60/es/master-construction-foreman.json"
DRAFT = "content/japanese-construction-foreman/master-translation-4-6-draft.json"
OLD_COMMIT = "9cb195e679f62b097f08d36b6814af4a56dbeaeb"
OLD_READER = "content/japanese-construction-foreman/master-original-reader-4-6-draft.json"


def source(path, revision="HEAD"):
    raw = subprocess.check_output(["git", "show", f"{revision}:{path}"], cwd=ROOT)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def build():
    reader, reader_hash = source(READER)
    curriculum, curriculum_hash = source(CURRICULUM)
    draft, draft_hash = source(DRAFT)
    historical, historical_hash = source(OLD_READER, OLD_COMMIT)
    lesson = curriculum["lessons"][5]
    assert lesson["n"] == draft["lessons"][2]["n"] == 6
    passage = reader["lessons"]["6"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    terms = {term["en"]: term["ja"] for term in draft["lessons"][2]["terms"]}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = terms.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:6:reader:line:{n}",
            "sourceSpanish": es,
            "sourceEnglish": en,
            "speaker": speaker if separator else None,
            "conditionalJapanesePhrase": candidate,
            "conditionalPhraseFromExactTermDraft": bool(candidate),
            "selectedJapanese": None,
            "qualifiedReview": False,
        })
    old = next(item for item in historical["lessons"] if item["n"] == 6)
    old_rows = [{"japanese": s["target"], "english": s["native"]} for s in old["sentences"]]
    assert len(old_rows) == 8
    return {
        "schema": 1,
        "state": "source-only-reader-gap-review",
        "target": "Japanese",
        "native": "English",
        "stage": "master",
        "lesson": 6,
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
                "sourceLocation": "Reader 2, 5–9",
                "question": "Preserve the specified-versus-substitute window distinction, supplier data-sheet attribution, U-factor, wind rating and bathroom tempered-glass requirement. A qualified Japanese/window-specification reviewer must settle exact terms and compliance implications; the draft does not establish equivalence.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 10–12",
                "question": "Preserve the rough-opening measurement, flashing and building-envelope terms, with the manufacturer's detail attributed to Rafael. A qualified envelope/window reviewer must settle the exact Japanese technical senses; this scene is not a general installation procedure.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 13–18",
                "question": "Preserve the stated critical-path/schedule comparison, architect's written approval before installation, temporary plastic covering and owner notice. A qualified construction/process reviewer must choose precise Japanese wording without turning the character's statements into independent advice.",
                "qualifiedDecision": None,
            },
        ],
        "rows": rows,
        "reviewGates": {key: False for key in (
            "qualifiedJapaneseReview", "qualifiedConstructionReview", "sourceTechnicalQuestionsResolved",
            "sourceParity", "dictionarySenses", "sixAuthoredModes", "forms", "speaking",
            "audioText", "audioListening", "savedItemMigration", "learnerRuntime", "offline",
            "progress", "v4Native", "qualifiedWindowSpecificationReview", "qualifiedEnvelopeReview",
        )},
    }


if __name__ == "__main__":
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if sys.argv[1:] == ["--check"]:
        assert OUT.read_text() == rendered, "packet.json differs from deterministic source build"
        print("PASS Japanese Foreman Master 6 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
