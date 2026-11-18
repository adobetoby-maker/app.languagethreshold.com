#!/usr/bin/env python3
"""Build the inert French 101 Master 11 source-decision packet."""

import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
SOURCES = [
    "src/data/core60/es/master-spanish-basics.json",
    "src/data/spanish-basics-practice.json",
    "content/review-archive/french-japanese-2026-11-15/french-101/master-10-12-redesign-draft.json",
]
master = json.loads((ROOT / SOURCES[0]).read_text())
practice = json.loads((ROOT / SOURCES[1]).read_text())
archive = json.loads((ROOT / SOURCES[2]).read_text())
source = next(row for row in master["lessons"] if row["n"] == 11)
reading = practice["master-spanish-basics"]["11"]["reading"]
old = next(row for row in archive["lessons"] if row["n"] == 11)

# Conditional review candidates only. Nulls mark grouped or culturally contingent senses.
card_proposals = [
    None, None, "le", None, None, None, None, "livres", None, "oui", "maison", "café",
    "J'aime le café.", "Julia aime le thé.", "Nous aimons les petits sandwichs.",
    "Diego n'aime pas les olives.", "Nous aimons manger sur la place.",
    "Tu aimes ce café tranquille ?", "J'aime la musique.", "Ana aime les livres.",
]
reader_proposals = card_proposals[12:] + [
    "Nous aimons étudier ensemble.", "Luis n'aime pas le café.",
    "Tu aimes ces chansons ?", "Oui, j'aime écouter de la musique à la maison.",
]
assert len(card_proposals) == 20 and len(reader_proposals) == 12

packet = {
    "schema": "french101-master11-source-decision-v1",
    "pairKey": "French:English",
    "courseId": "french-basics",
    "moduleId": "master-french-basics",
    "stage": "master",
    "n": 11,
    "stableLessonId": "master-french-basics:11",
    "stablePairId": "master-french-basics:11:fr-en",
    "sourceFilesSha256": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in SOURCES},
    "sourceTitleEnglish": source["title"],
    "sourceObjectiveEnglish": source["objective"],
    "sourceFocusEnglish": source["focus"],
    "sourceSpeakingEnglish": source["speaking"],
    "sourceGrammarEnglish": source["grammar"],
    "sourceReaderTitleSpanish": reading["title"],
    "cards": [
        {
            "id": f"master-french-basics:11:card:{i}",
            "sourceSpanish": row["es"],
            "sourceEnglish": row["en"],
            "kind": row["kind"],
            "proposedFrench": card_proposals[i - 1],
            "selectedFrench": None,
            "decisionRequired": i in (1, 2, 3, 4, 5, 6, 7, 9, 12, 15, 17, 18),
        }
        for i, row in enumerate(source["words"], 1)
    ],
    "reader": [
        {
            "id": f"master-french-basics:11:reader:{i}",
            "sourceSpanish": es,
            "sourceEnglish": en,
            "proposedFrench": reader_proposals[i - 1],
            "selectedFrench": None,
        }
        for i, (es, en) in enumerate(zip(reading["target"], reading["native"]), 1)
    ],
    "conditionalArchivedRedesign": {
        "titleFrench": old["title"],
        "objectiveEnglish": old["objective"],
        "sceneEnglish": old["scene"],
        "sourceMeaningAligned": False,
        "progressReuseAllowed": False,
        "audioReuseAllowed": False,
    },
    "sourceMeaningQuestions": [
        "Spanish gustar agrees with the liked item; French aimer agrees with the person who likes it. The beginner source objective cannot be projected as an equivalent French grammar rule.",
        "me/te and the grouped article/object senses in la, los and las require contextual French dictionary and scoring entries; French les does not preserve Spanish masculine/feminine plural distinctions.",
        "Spanish no maps to French non or ne ... pas by context. A single flashcard face would merge unlike uses.",
        "The source café card groups the drink and the establishment; the question about a quiet café means the establishment.",
        "The archived two-order dietary-substitution scene changes the source's shared-snack/preferences objective and cannot inherit this lesson's saved items or audio.",
    ],
    "conditionalModeAnchors": {
        name: {"sourceRefs": refs, "selectedPrompt": None, "selectedTarget": None, "readyForLearner": False}
        for name, refs in {
            "see": ["master-french-basics:11:reader:1"],
            "recall": ["master-french-basics:11:card:13"],
            "hear": ["master-french-basics:11:reader:4"],
            "type": ["master-french-basics:11:card:15"],
            "say": ["master-french-basics:11:reader:6"],
            "write": ["master-french-basics:11:reader:12"],
        }.items()
    },
    "candidateSpeakingEnglish": source["speaking"],
    "selectedSpeakingFrench": None,
    "normalCardProjectionAllowed": False,
    "selectedDecision": None,
    "audioScripts": None,
    "gates": {name: False for name in (
        "reviewed", "learnerRegistered", "scoringReady", "audioRegistered", "listeningReviewed",
        "offlineRegistered", "progressRegistered", "ownerRouteRegistered", "v4Registered",
    )},
}

rendered = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
out = HERE / "decision.json"
if "--check" in sys.argv:
    assert out.read_text() == rendered, "Master 11 packet differs from current source/build"
    print("PASS French 101 Master 11 build --check")
else:
    out.write_text(rendered)
    print(f"Wrote {out}")
