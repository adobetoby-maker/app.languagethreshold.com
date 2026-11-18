#!/usr/bin/env python3
"""Build the inert Master 16 Reader source decision packet."""

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
    lesson = curriculum["lessons"][15]
    translation = draft["lessons"][0]
    assert lesson["n"] == translation["n"] == 16 and draft["reviewed"] is False
    passage = reader["lessons"]["16"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    phrases = {term["en"]: term["ja"] for term in translation["terms"] if term["kind"] == "phrase"}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = phrases.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:16:reader:line:{n}",
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
        "lesson": 16,
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
            "lesson16OriginalReaderDraftPresent": False,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–6 and lesson speaking",
                "question": "Keep Inés Carrillo's compliance-officer role and the company's own safety-plan inspection frequency attributed to this scene. Preserve Julio Paredes as both scaffold erector and designated competent person. Review the Japanese trade and role terms; do not turn the company policy into a universal legal frequency.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 6–12",
                "question": "Preserve cross braces, top rail, midrail, toe board on open sides, inspection log and tag as distinct parts and records. Review technical Japanese and any locale-dependent scaffold terminology with a qualified scaffold specialist.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 13–18",
                "question": "The green tag on section 3 lacks today's signature. Rubén bars access until the designated competent person inspects and signs; Julio then records and signs, and Rubén promises today's corrective-action record by email. Do not infer that tag color alone certifies safe access. Review the draft phrase's 'inspection supervisor' wording against the source's 'competent person'.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 3–5, 9–12 and 15–18; lesson grammar",
                "question": "The compliance-officer exchange is formal, while the radio instruction to the crew is informal. Review Japanese register and source Spanish usted/passive se adaptation before selecting full Reader turns, authored mode targets or recording scripts.",
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
        print("PASS Japanese Foreman Master 16 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
