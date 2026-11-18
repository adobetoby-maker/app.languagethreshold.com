#!/usr/bin/env python3
"""Build the inert Master 17 Reader source decision packet."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).with_name("packet.json")
READER = "public/lesson-content/es/master-construction-foreman.json"
CURRICULUM = "src/data/core60/es/master-construction-foreman.json"
DRAFT = "content/japanese-construction-foreman/master-translation-16-18-draft.json"


def source(path):
    raw = subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=ROOT)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def build():
    reader, reader_hash = source(READER)
    curriculum, curriculum_hash = source(CURRICULUM)
    draft, draft_hash = source(DRAFT)
    lesson = curriculum["lessons"][16]
    translation = draft["lessons"][1]
    assert lesson["n"] == translation["n"] == 17 and draft["reviewed"] is False
    passage = reader["lessons"]["17"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    phrases = {term["en"]: term["ja"] for term in translation["terms"] if term["kind"] == "phrase"}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = phrases.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:17:reader:line:{n}",
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
        "lesson": 17,
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
            "lesson17OriginalReaderDraftPresent": False,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–7 and lesson speaking",
                "question": "Preserve Raúl Medina as foreman of a dental-clinic build and Elena Cruz as project manager. The concrete pump truck was due at 7:00, eight workers were ready at 6:30, and dispatch reported at 8:00 that its operator was sick with no substitute. Attribute the delay to staffing, not weather. Review Japanese trade and reporting terms with qualified construction personnel.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 8–13",
                "question": "Distinguish ready-mix concrete ordered for 7:30 from the plant holding its trucks before departure, avoiding the feared waste. Four hours of work were lost due to the missing pump truck, and Raúl records each worker's hours. During downtime the crew tied missing rebar in the north corner, checked formwork and cleaned the pour area. Review Japanese terms for pump truck, ready-mix, rebar, formwork and pour.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 14–18",
                "question": "Elena was notified by phone at 8:15, and Raúl requested written confirmation of the new schedule from the pump company. The pour moved to tomorrow. He will call dispatch at 6:00 to confirm the pump truck is on its way, then sends Elena the daily log for forwarding to the owner. Preserve who was notified, the written-confirmation request and the next-step ownership.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 2, 4–5, 7, 9–10, 13–18; lesson grammar",
                "question": "The source teaches formal written daily-log connectors debido a, por lo tanto, sin embargo and cabe señalar que, with some passive or impersonal constructions. Review how Japanese written-log register conveys these meanings before selecting full Reader turns, authored mode targets or recording scripts. The eight phrase fragments omit narrative context and are not full Reader translations.",
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
        print("PASS Japanese Foreman Master 17 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
