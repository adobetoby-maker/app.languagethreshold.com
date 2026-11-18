#!/usr/bin/env python3
"""Build the inert Foreman Master 13 Reader source-decision packet."""

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
    lesson = curriculum["lessons"][12]
    translation = draft["lessons"][0]
    assert lesson["n"] == translation["n"] == 13 and draft["reviewed"] is False
    passage = reader["lessons"]["13"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 17
    terms = {term["en"]: term["ja"] for term in translation["terms"]}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = terms.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:13:reader:line:{n}",
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
        "lesson": 13,
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
            "sourceSpeakingEnglish": lesson["speaking"],
        },
        "historicalPrivateReader": {
            "lesson13OriginalReaderDraftPresent": False,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–5, 13–16",
                "question": "Preserve Héctor Salas, Patricia León, the Ortiz house jobsite, only witness Tomás Ruiz, Samuel's 10:40 saw work and the fact that Héctor did not see the cut. Decide Japanese time narration and witness/statement register without inferring injury cause.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 6–12",
                "question": "Preserve the reported palm cut and bleeding, Rosa Díaz's first-aid training and gauze pressure, the source's 911 request, ambulance wait, unplugging and out-of-service tag, transport to hospital, photo sequence, blade guard and riving knife. Qualified trade/clinical/source review must resolve terminology and the source locale before Japanese selection; do not add treatment or regulatory claims.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 13–17",
                "question": "Keep the push stick observed on the floor without claiming it was used, the explicit unknown cause, Patricia's requested photos and Rosa's statement, and the source's no-use-until-investigation line. Decide Japanese attribution and audience-specific register without changing evidentiary certainty.",
                "qualifiedDecision": None,
            },
        ],
        "rows": rows,
        "reviewGates": {key: False for key in (
            "qualifiedJapaneseReview", "qualifiedConstructionReview", "qualifiedClinicalReview",
            "sourceTechnicalQuestionsResolved", "sourceParity", "dictionarySenses",
            "sixAuthoredModes", "forms", "speaking", "audioText", "audioListening",
            "savedItemMigration", "ownerRoute", "learnerRuntime", "scoring", "offline",
            "progress", "v4Native",
        )},
    }


if __name__ == "__main__":
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if sys.argv[1:] == ["--check"]:
        assert OUT.read_text() == rendered, "packet.json differs from deterministic source build"
        print("PASS Japanese Foreman Master 13 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
