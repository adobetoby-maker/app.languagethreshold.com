#!/usr/bin/env python3
"""Read-only source, identity and closed-gate checks for Master 3."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PACKET = json.loads(Path(__file__).with_name("decision.json").read_text())
MASTER = ROOT / "src/data/core60/es/master-spanish-basics.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-1-3-redesign-draft.json"

for path in (MASTER, PRACTICE, ARCHIVE):
    assert hashlib.sha256(path.read_bytes()).hexdigest() == PACKET["sourceFilesSha256"][str(path.relative_to(ROOT))]

source = next(lesson for lesson in json.loads(MASTER.read_text())["lessons"] if lesson["n"] == 3)
reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["3"]["reading"]
assert PACKET["moduleId"] == "master-french-basics"
assert PACKET["stableLessonId"] == "master-french-basics:3"
assert PACKET["sourceTitleEnglish"] == source["title"]
assert PACKET["sourceObjectiveEnglish"] == source["objective"]
assert PACKET["sourceSpeakingEnglish"] == source["speaking"]
assert PACKET["sourceReaderTitleSpanish"] == reading["title"]
assert len(PACKET["cards"]) == len(source["words"]) == 20
assert len(PACKET["reader"]) == len(reading["target"]) == len(reading["native"]) == 12

for i, (row, exact) in enumerate(zip(PACKET["cards"], source["words"]), 1):
    assert row["id"] == f"master-french-basics:3:card:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (
        exact["es"], exact["en"], exact["kind"]
    )
    assert row["selectedFrench"] is None and row["proposedFrench"]
    assert row["decisionRequired"] == (i in (3, 8, 10, 11, 12))

for i, (row, es, en) in enumerate(zip(PACKET["reader"], reading["target"], reading["native"]), 1):
    assert row["id"] == f"master-french-basics:3:reader:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
    assert row["selectedFrench"] is None and row["proposedFrench"]

assert PACKET["cards"][2]["sourceEnglish"] == "class / classroom"
assert PACKET["cards"][7]["sourceEnglish"] == "in / on / at"
assert PACKET["cards"][9]["sourceEnglish"] == "are (identity)"
assert PACKET["cards"][10]["sourceEnglish"] == "are (condition/location)"
assert PACKET["cards"][11]["sourceSpanish"] == "los"
assert PACKET["cards"][11]["proposedFrench"] == "les"
assert PACKET["normalCardProjectionAllowed"] is False
assert PACKET["selectedDecision"] is None
assert len([gap for gap in PACKET["sourceConflicts"] if gap.get("kind") == "card-face"]) == 5

assert set(PACKET["candidateModes"]) == {"see", "recall", "hear", "type", "say", "write"}
available = {row["proposedFrench"] for row in PACKET["cards"] + PACKET["reader"]}
for name, mode in PACKET["candidateModes"].items():
    assert mode["reviewKey"] == f"master-french-basics:3:mode:{name}"
    assert mode["targetText"] in available and mode["sourceRefs"]
    assert mode["readyForLearner"] is False
assert PACKET["candidateModes"]["hear"]["recordedAudio"] is False
assert len(PACKET["candidateForms"]) == 14
assert all(form["reviewed"] is False and form["readyForLearner"] is False for form in PACKET["candidateForms"])
assert PACKET["candidateSpeaking"] and PACKET["candidateSpeakingReadyForLearner"] is False
assert PACKET["gates"] and not any(PACKET["gates"].values())
print("PASS French 101 Master 3 exact source, IDs, five disputes and closed gates")
