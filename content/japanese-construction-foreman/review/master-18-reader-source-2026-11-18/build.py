#!/usr/bin/env python3
"""Build the inert Master 18 Reader source decision packet."""

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
    lesson = curriculum["lessons"][17]
    translation = draft["lessons"][2]
    assert lesson["n"] == translation["n"] == 18 and draft["reviewed"] is False
    passage = reader["lessons"]["18"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    phrases = {term["en"]: term["ja"] for term in translation["terms"] if term["kind"] == "phrase"}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = phrases.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:18:reader:line:{n}",
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
        "lesson": 18,
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
            "lesson18OriginalReaderDraftPresent": False,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–4; lesson title and speaking",
                "question": "Preserve Lorena Ibarra as the city scheduler, the permit-office callback and the sick inspector moving the insulation inspection to tomorrow. The Japanese draft's introductory phrase names Miguel Rojas and a duplex, but that English sentence is not a current Reader turn; keep it separate from selected Reader text.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 5–11",
                "question": "The confirmed arrival window remains tomorrow 8:00–12:00. Miguel requests before 10:00, but Lorena only promises a note, not a new confirmed time. Preserve confirmation number 4471 and Miguel's pending email confirmation. Review the Japanese distinctions between a request, a note and a confirmed appointment.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 12–18",
                "question": "Preserve the group text, failed call and short voicemail, Óscar's already-loaded truck, the request to move drywall hanging until after inspection, and Óscar's day-after-tomorrow 7:00 commitment. Do not turn a proposed schedule into an earlier completed inspection or claim the truck was unloaded.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 2, 5, 7, 9, 11, 14, 16–18; lesson grammar",
                "question": "Review polite permit-office phone register versus direct crew text and informal sub-contractor voicemail, the city/time phrasing, and Japanese adaptation of source le llamo de parte de, ¿me podría confirmar...? and ¿sería posible...? before selecting Reader turns or recording scripts.",
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
        print("PASS Japanese Foreman Master 18 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
