#!/usr/bin/env python3
"""Build the inert Master 11 Reader source decision packet."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).with_name("packet.json")
READER = "public/lesson-content/es/master-construction-foreman.json"
CURRICULUM = "src/data/core60/es/master-construction-foreman.json"
DRAFT = "content/japanese-construction-foreman/master-translation-10-12-draft.json"


def source(path):
    raw = subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=ROOT)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def build():
    reader, reader_hash = source(READER)
    curriculum, curriculum_hash = source(CURRICULUM)
    draft, draft_hash = source(DRAFT)
    lesson = curriculum["lessons"][10]
    translation = draft["lessons"][1]
    assert lesson["n"] == translation["n"] == 11 and draft["reviewed"] is False
    passage = reader["lessons"]["11"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    terms = {term["en"]: term["ja"] for term in translation["terms"]}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = terms.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:11:reader:line:{n}",
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
        "lesson": 11,
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
            "lesson11OriginalReaderDraftPresent": False,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–5",
                "question": "Preserve the San Antonio hotel opening in two weeks, a month of overtime, carpenter lead Fernanda Ruiz, foreman Héctor Molina, door-frame mistakes and the project manager's approved extra lobby workers. Review burnout, overtime and morale terms and reported speech without changing the workers' accounts.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 6–12",
                "question": "Keep Héctor's concrete commitments distinct: nobody works Sunday, two extra people arrive tomorrow, and the crew's effort is recognized. Qualified Japanese/workplace reviewers must settle plural crew address, register, home-stretch idiom and whether the draft's promise wording adds certainty beyond the source.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 13–18",
                "question": "Iván Paredes is a 19-year-old laborer who plans to resign Friday because overtime without a raise does not cover rent and he is not learning new skills. Héctor offers to discuss training with the office, Monday carpentry work with Fernanda, and to ask the project manager for a raise. Iván agrees to stay at least until opening; no raise or training approval has yet occurred. Review employment terms and conditional promises with qualified Japanese/domain reviewers.",
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
        print("PASS Japanese Foreman Master 11 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
