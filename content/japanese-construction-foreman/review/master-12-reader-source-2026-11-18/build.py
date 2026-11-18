#!/usr/bin/env python3
"""Build the inert Master 12 Reader source decision packet."""

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
    lesson = curriculum["lessons"][11]
    translation = draft["lessons"][2]
    assert lesson["n"] == translation["n"] == 12 and draft["reviewed"] is False
    passage = reader["lessons"]["12"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    terms = {term["en"]: term["ja"] for term in translation["terms"]}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = terms.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:12:reader:line:{n}",
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
        "lesson": 12,
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
            "lesson12OriginalReaderDraftPresent": False,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–6",
                "question": "Keep Calle Olmo, the failed emergency phone, inspector Raquel Méndez's inability to approve the elevator and Ramón Vega's four distinct listeners. A qualified Japanese/building reviewer must decide exact elevator-cab emergency phone and inspection terms without adding an independent code claim.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 4–17",
                "question": "The Spanish objective contrasts tú and usted with Beto, owner Arturo Lozano, superintendent Diana Quiroga and inspector Méndez. Japanese register and role address cannot be copied mechanically from Spanish pronouns. Decide natural audience-specific register while preserving who is addressed and what each speaker actually says.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 9–12 and 18",
                "question": "Keep Saturday tenant move-in, the scene's elevator certificate of operation before building certificate of occupancy, the emailed new date and Thursday follow-up. The inspector asks for a working emergency phone and a clean, dry elevator pit. Qualified trade/locale review must check document names and sequence without treating this dialogue as general permitting advice.",
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
        print("PASS Japanese Foreman Master 12 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
