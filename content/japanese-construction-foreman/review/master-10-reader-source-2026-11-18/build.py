#!/usr/bin/env python3
"""Build the inert Master 10 Reader source decision packet."""

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
    lesson = curriculum["lessons"][9]
    translation = draft["lessons"][0]
    assert lesson["n"] == translation["n"] == 10 and draft["reviewed"] is False
    passage = reader["lessons"]["10"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    terms = {term["en"]: term["ja"] for term in translation["terms"]}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = terms.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:10:reader:line:{n}",
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
        "lesson": 10,
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
            "lesson10OriginalReaderDraftPresent": False,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–8",
                "question": "Preserve the medical office build-out, Marisol Vega (electrical), Tomás Aguirre (plumbing), foreman Rafael Ortiz, and the shared space above the drop ceiling. Qualified Japanese/construction reviewers must settle cable tray, air duct, bathroom vent pipe, drain slope, elevation and coordination drawing terminology without changing the speakers' accounts.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 9–14",
                "question": "Preserve Marisol's March 3 drawing and Tomás's and the general contractor's March 17 drawing, sprinkler line tight to slab, and already installed threaded rods. The source resolves a version clash, not dishonesty or independent design approval. Review register, dates, reported speech and technical terms with qualified Japanese and trade reviewers.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 15–18",
                "question": "The drain-before-tray installation order follows the March 17 coordination drawing within the narrated agreement; keep the conditional line 15 and the actual confirmation at line 16 distinct. Preserve access to Tomás's valve through the marked panel and Rafael's email to the general contractor. Qualified trade review must verify the translation does not turn a scene-specific sequence into general construction instruction or an unearned sign-off.",
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
        print("PASS Japanese Foreman Master 10 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
