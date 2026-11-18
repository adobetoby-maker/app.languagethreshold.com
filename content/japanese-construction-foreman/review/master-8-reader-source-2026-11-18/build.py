#!/usr/bin/env python3
"""Build the inert Master 8 Reader source decision packet."""

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
    lesson = curriculum["lessons"][7]
    assert lesson["n"] == draft["lessons"][1]["n"] == 8
    passage = reader["lessons"]["8"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    terms = {term["en"]: term["ja"] for term in draft["lessons"][1]["terms"]}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = terms.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:8:reader:line:{n}",
            "sourceSpanish": es,
            "sourceEnglish": en,
            "speaker": speaker if separator else None,
            "conditionalJapanesePhrase": candidate,
            "conditionalPhraseFromExactTermDraft": bool(candidate),
            "selectedJapanese": None,
            "qualifiedReview": False,
        })
    old = next(item for item in historical["lessons"] if item["n"] == 8)
    old_rows = [{"japanese": s["target"], "english": s["native"]} for s in old["sentences"]]
    assert len(old_rows) == 8
    return {
        "schema": 1,
        "state": "source-only-reader-gap-review",
        "target": "Japanese",
        "native": "English",
        "stage": "master",
        "lesson": 8,
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
                "sourceLocation": "Reader 1–9",
                "question": "Preserve Tuesday warehouse retrofit, foreman Tomás Herrera, owner's rep Ricardo Peña, Javier and Luis, temporary north-side guardrail, the request to remove it for faster HVAC placement, and Tomás's refusal. A qualified Japanese/construction safety reviewer must settle guardrail, open edge, fall protection and OSHA fine terms; attribute the financial and safety claims to Tomás rather than presenting them as independent guidance.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 10–16",
                "question": "Preserve the planned Thursday 7:00 crane lift, rigger's sling inspection, signal person's radio guidance, exclusion zone below the load, warning line and fall protection remaining according to the safety plan, and preparation of bases and connections while waiting. A qualified Japanese/rigging reviewer must choose terms and confirm context without converting this narrated plan into instructions for performing a lift.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 17–18",
                "question": "Preserve Tomás's repeated instruction to Javier and Luis that the guardrail stays and his exact tied-off warning. A qualified Japanese/fall-protection reviewer must resolve the draft's lanyard-hook specificity against the source's general 'tied off' wording and confirm locale/OSHA context before any learner or audio use.",
                "qualifiedDecision": None,
            },
        ],
        "rows": rows,
        "reviewGates": {key: False for key in (
            "qualifiedJapaneseReview", "qualifiedConstructionReview", "sourceTechnicalQuestionsResolved",
            "sourceParity", "dictionarySenses", "sixAuthoredModes", "forms", "speaking",
            "audioText", "audioListening", "savedItemMigration", "learnerRuntime", "offline",
            "progress", "v4Native", "qualifiedFallProtectionReview", "qualifiedRiggingReview",
        )},
    }


if __name__ == "__main__":
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if sys.argv[1:] == ["--check"]:
        assert OUT.read_text() == rendered, "packet.json differs from deterministic source build"
        print("PASS Japanese Foreman Master 8 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
