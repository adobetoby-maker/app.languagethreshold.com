#!/usr/bin/env python3
"""Build the inert Master 19 Reader source decision packet."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).with_name("packet.json")
READER = "public/lesson-content/es/master-construction-foreman.json"
CURRICULUM = "src/data/core60/es/master-construction-foreman.json"
DRAFT = "content/japanese-construction-foreman/master-translation-19-20-draft.json"


def source(path):
    raw = subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=ROOT)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def build():
    reader, reader_hash = source(READER)
    curriculum, curriculum_hash = source(CURRICULUM)
    draft, draft_hash = source(DRAFT)
    lesson = curriculum["lessons"][18]
    translation = draft["lessons"][0]
    assert lesson["n"] == translation["n"] == 19 and draft["reviewed"] is False
    passage = reader["lessons"]["19"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    phrases = {term["en"]: term["ja"] for term in translation["terms"] if term["kind"] == "phrase"}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = phrases.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:19:reader:line:{n}",
            "sourceSpanish": es,
            "sourceEnglish": en,
            "speaker": speaker if separator and speaker == "Ramón" else None,
            "embeddedSpeech": plain if separator and speaker != "Ramón" else None,
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
        "lesson": 19,
        "moduleId": "master-construction-foreman-ja-en",
        "reviewed": False,
        "registered": False,
        "audioRegistered": False,
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
            "lesson19OriginalReaderDraftPresent": False,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–3; title and objective",
                "question": "Preserve the Pequeños Pasos daycare, director Claudia Benítez, Monday turnover, the contract's one-year workmanship warranty and its start when Claudia signs. Review the Japanese legal/construction distinction between workmanship warranty, defect coverage and general building warranty without adding promises beyond the contract.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 4–10",
                "question": "Preserve the infants' room, hairline concrete cracks, Ramón's statement that shrinkage is almost always the cause, free inspection unless the contract says otherwise, repair only if a workmanship defect, measuring a widening crack, and normal use versus misuse. The source's normality/causation claim and contract scope need qualified construction/warranty review; Japanese must not turn conditional inspection or repair into a guarantee.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 11–18",
                "question": "Preserve the playroom's heavy book shelving, drywall partition, unknown in-wall blocking, bought wall anchors, unknown load capacity and the project engineer's written confirmation. Do not imply the purchased anchors alone prove capacity or allow hanging before engineer confirmation. Preserve preapproval for wall modification, possible warranty exclusion after unauthorized drilling and the handoff of the maintenance manual.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 6–7, 13–17; grammar and register",
                "question": "Review polite foreman-to-director Japanese register and conditional scope for a menos que, siempre que, revisaríamos, le pediría and podría no cubrirlo. Distinguish source quotes from narrative, especially the embedded final quotation in Reader 18; validate concrete, drywall, blocking, anchors, load capacity and warranty terms before selecting Japanese or audio.",
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
        print("PASS Japanese Foreman Master 19 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
