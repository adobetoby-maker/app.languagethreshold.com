#!/usr/bin/env python3
"""Build inert Foreman Master 15 Reader source decision evidence."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).with_name("packet.json")
READER = "public/lesson-content/es/master-construction-foreman.json"
CURRICULUM = "src/data/core60/es/master-construction-foreman.json"
DRAFT = "content/japanese-construction-foreman/master-translation-13-15-draft.json"


def source(path):
    raw = subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=ROOT)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def build():
    reader, reader_hash = source(READER)
    curriculum, curriculum_hash = source(CURRICULUM)
    draft, draft_hash = source(DRAFT)
    lesson = curriculum["lessons"][14]
    translation = draft["lessons"][2]
    assert lesson["n"] == translation["n"] == 15 and draft["reviewed"] is False
    passage = reader["lessons"]["15"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    terms = {term["en"]: term["ja"] for term in translation["terms"]}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = terms.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:15:reader:line:{n}",
            "sourceSpanish": es,
            "sourceEnglish": en,
            "speaker": speaker if separator else None,
            "conditionalJapanesePhrase": candidate,
            "conditionalPhraseFromExactTermDraft": bool(candidate),
            "selectedJapanese": None,
            "audioScript": None,
            "qualifiedReview": False,
        })
    return {
        "schema": 1,
        "state": "source-only-reader-gap-review",
        "target": "Japanese",
        "native": "English",
        "stage": "master",
        "lesson": 15,
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
            "lesson15OriginalReaderDraftPresent": False,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–8",
                "question": "Preserve the Jefferson Street widening job near a school, Raúl's report that the bucket hit something, strong gas smell and hiss, Javier's stop-work order, and the conditional machine shutoff. Review Japanese gas, trench and ignition terminology with qualified construction and utility specialists; do not turn the scene into universal emergency procedure.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 7–11",
                "question": "Preserve the north-corner assembly point as a wind-dependent scene detail, its conditional relocation, the source's US 911 call and reported firefighters. Review locale, emergency wording and Japanese radio/register choices without substituting a Japanese emergency number.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 12–18",
                "question": "Preserve the separate gas-utility call, the employee's attributed about-20-minute arrival and do-not-touch-line statement, Teresa the crossing guard, school notification and firefighter evacuation decision. Keep possible leak distinct from confirmed leak, and review all technical and school-scene facts before selecting audio or learner answers.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Lesson grammar and speaking",
                "question": "The source teaches direct orders and conditional clauses. Review Japanese command/register adaptation and six authored prompt/target pairs; eight private term phrases exactly match English fragments but none is a full approved speaker-labeled Reader turn.",
                "qualifiedDecision": None,
            },
        ],
        "rows": rows,
        "reviewGates": {key: False for key in (
            "qualifiedJapaneseReview", "qualifiedConstructionReview", "sourceTechnicalQuestionsResolved",
            "sourceParity", "dictionarySenses", "sixAuthoredModes", "forms", "speaking",
            "audioText", "audioListening", "savedItemMigration", "ownerRoute", "learnerRuntime",
            "scoring", "offline", "progress", "v4Native",
        )},
    }


if __name__ == "__main__":
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if sys.argv[1:] == ["--check"]:
        assert OUT.read_text() == rendered, "packet.json differs from deterministic source build"
        print("PASS Japanese Foreman Master 15 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
