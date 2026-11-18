#!/usr/bin/env python3
"""Build the inert Master 14 Reader source decision packet."""

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
    lesson = curriculum["lessons"][13]
    translation = draft["lessons"][1]
    assert lesson["n"] == translation["n"] == 14 and draft["reviewed"] is False
    passage = reader["lessons"]["14"]["passage"]
    assert len(passage["target"]) == len(passage["native"]) == 18
    terms = {term["en"]: term["ja"] for term in translation["terms"]}
    rows = []
    for n, (es, en) in enumerate(zip(passage["target"], passage["native"]), 1):
        speaker, separator, plain = en.partition(": ")
        candidate = terms.get(plain if separator else en)
        rows.append({
            "id": f"master-construction-foreman-ja-en:lesson:14:reader:line:{n}",
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
        "lesson": 14,
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
            "lesson14OriginalReaderDraftPresent": False,
            "reuseDecision": None,
        },
        "openDomainReview": [
            {
                "sourceLocation": "Reader 1–3, 8–9 and 11",
                "question": "Preserve the bridge abutment, slipped rebar bundle, wood blocking, 10-foot distance, no injury, single choker sling and unchecked center of gravity. Review Japanese rigging, wood-blocking and load-path terms with a qualified lifting specialist; do not replace the source account with a generic accident story.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 4–12 and 18",
                "question": "Ramón asks Alma and Nicolás for the facts without blame, says the incident could have been serious, and thanks them for honest accounts. Review the conditional Japanese phrase fragments for natural register and near-miss meaning; none includes the full speaker-labeled Reader turn.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Reader 13–18",
                "question": "The lift plan in this scene calls for two choker slings per bundle. Preserve the test lift, lower-and-rerig-if-unbalanced, tag-line distance, no one under the suspended load, and next-day crew report as the characters' agreed actions. Qualified lifting/safety review must not turn one scene's lift-plan detail into universal rigging instruction or imply suspended-load exclusion applies only once.",
                "qualifiedDecision": None,
            },
            {
                "sourceLocation": "Lesson grammar and speaking",
                "question": "The Spanish source teaches por poco, casi, podría haber and si clauses. Review Japanese counterfactual/conditional teaching and the non-accusatory speaking objective as a language adaptation before selecting scored modes or audio scripts.",
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
        print("PASS Japanese Foreman Master 14 Reader packet build --check")
    elif not sys.argv[1:]:
        OUT.write_text(rendered)
    else:
        raise SystemExit("usage: build.py [--check]")
