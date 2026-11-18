#!/usr/bin/env python3
"""Read-only Master 1 source, identity, conditional-content and gate check."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
packet = json.loads(Path(__file__).with_name("packet.json").read_text())
assert packet["schema"] == "french101-master1-inert-source-decision-v1"
assert packet["stableLessonKey"] == "master-french-basics:1"
assert packet["candidatePairId"] == "master-french-basics:1:fr-en"
source = {}
for name, digest in packet["sourceFilesSHA256"].items():
    raw = (ROOT / name).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == digest, name
    source[name] = json.loads(raw)
lesson = source["src/data/core60/es/master-spanish-basics.json"]["lessons"][0]
reading = source["src/data/spanish-basics-practice.json"]["master-spanish-basics"]["1"]["reading"]
assert lesson["n"] == packet["lessonNumber"] == 1
assert (lesson["title"], lesson["objective"], lesson["focus"], lesson["grammar"], lesson["speaking"]) == (
    packet["sourceTitleEnglish"], packet["sourceObjective"], packet["sourceFocus"],
    packet["sourceGrammar"], packet["sourceSpeaking"]
)
assert reading["title"] == packet["sourceReaderTitleSpanish"]
assert len(packet["cards"]) == len(lesson["words"]) == 20
assert len(packet["reader"]) == len(reading["target"]) == len(reading["native"]) == 12
for n, (row, original) in enumerate(zip(packet["cards"], lesson["words"]), 1):
    assert row["id"] == f"master-french-basics:1:card:{n}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["sourceKind"]) == (
        original["es"], original["en"], original["kind"]
    )
    assert row["selectedFrench"] is None and row["scoringEnabled"] is False
for n, row in enumerate(packet["reader"], 1):
    assert row["id"] == f"master-french-basics:1:reader:{n}"
    assert row["sourceSpanish"] == reading["target"][n - 1]
    assert row["sourceEnglish"] == reading["native"][n - 1]
    assert row["selectedFrench"] is None
assert [r["id"] for r in packet["disputedFaces"]] == [
    f"master-french-basics:1:card:{n}" for n in (2, 3, 4, 8, 9, 17, 19)
]
for row in packet["disputedFaces"]:
    card = next(c for c in packet["cards"] if c["id"] == row["id"])
    assert (row["sourceSpanish"], row["sourceEnglish"], row["candidateFrench"]) == (
        card["sourceSpanish"], card["sourceEnglish"], card["candidateFrench"]
    )
    assert row["selectedFrench"] is None and row["scoringEnabled"] is False
assert [mode["name"] for mode in packet["conditionalModePreviews"]] == [
    "see", "recall", "hear", "type", "say", "write"
]
for mode in packet["conditionalModePreviews"]:
    assert mode["id"] == f"master-french-basics:1:mode:{mode['name']}"
    assert mode["authoredForLearner"] is False
    assert mode["recordedAudio"] is False and mode["scoringEnabled"] is False
assert packet["conditionalModePreviews"][-1]["supplementalFrenchForm"] is True
assert len(packet["conditionalFormPreviews"]) == 6
for form in packet["conditionalFormPreviews"]:
    turn = packet["reader"][form["sourceReaderTurn"] - 1]
    assert form["sourceEnglish"] == turn["sourceEnglish"]
    assert form["candidateFrench"] == turn["candidateFrench"]
    assert form["authoredForLearner"] is False
    assert form["reviewed"] is False and form["scoringEnabled"] is False
texts = [c["candidateFrench"] for c in packet["cards"]] + [r["candidateFrench"] for r in packet["reader"]]
assert packet["audioScope"]["candidatePositions"] == len(texts) == 32
assert packet["audioScope"]["distinctCandidateStrings"] == len(set(texts))
assert all(v is False for v in packet["gates"].values())
print("PASS French 101 Master 1 exact source, IDs, seven disputes and closed gates")
