#!/usr/bin/env python3
"""Build the inert Master 20 Reader source decision packet."""

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
    lesson = curriculum["lessons"][19]
    translation = draft["lessons"][1]
    assert lesson["n"] == translation["n"] == 20 and draft["reviewed"] is False
    passage = reader["lessons"]["20"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    phrases = {term["en"]: term["ja"] for term in translation["terms"] if term["kind"] == "phrase"}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = phrases.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:20:reader:line:{n}",
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
        "lesson": 20,
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
            "lesson20OriginalReaderDraftPresent": False,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–5; source objective and speaking",
                "question": "Preserve Ramón Ortiz training new hire Lupita Navas at the community gym, already two weeks behind schedule. His direct demonstration and clip-in warning precede the 9:00 steel-joist delivery. Review whether the source's clip-in instruction requires explicit approved anchor and competent-person context before use as safety teaching; do not silently expand the selected Reader translation.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 4–8; procurement and chronology",
                "question": "Ramón counts a short delivery against the purchase order for 48 steel joists, states that 12 are missing according to the delivery ticket, and asks Gerardo Ponce for the missing joists today. Gerardo has no stock and promises a rush shipment Thursday morning. Do not make the shortage a count of 12 delivered, make the shipment a confirmed same-day delivery, or confuse the Mexican remisión with a purchase order.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 9–14; fall-protection refusal and falling object",
                "question": "Felipe Cano asks to remove a section of perimeter fall protection to lift materials faster; Ramón refuses and points to the site safety plan's crane method. After lunch, a wrench falls from the second level without striking anyone; Ramón stops work, records a no-injury incident, tells the crew to tie off tools and bars work below until the area is roped off. Require qualified construction/safety review of perimeter protection, crane, tool tether and exclusion-zone wording. Do not imply that no injury means no hazard or that removal was approved.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 15–18; inspector and daily report; lesson grammar",
                "question": "At 3:00 building inspector Dolores Arce checks each weld against structural plans and records two correction-list items. Ramón's daily report says the roof will finish Friday because of the short delivery and records his refusal of Felipe's perimeter-protection shortcut. Review inspector honorific, crew/supplier/subcontractor register, written-report tense and cause/concession connectors before selecting Japanese turns or recording scripts. Do not present the two correction items as already fixed or the Friday finish as a completed fact.",
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
        print("PASS Japanese Foreman Master 20 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
