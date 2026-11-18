#!/usr/bin/env python3
"""Read-only source and gate check for the Core 27 decision packet."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PACKET = json.loads((Path(__file__).with_name("decision.json")).read_text())
CORE = ROOT / "src/data/spanish-basics-core.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/core-25-27-draft.json"

for path in (CORE, PRACTICE, ARCHIVE):
    assert hashlib.sha256(path.read_bytes()).hexdigest() == PACKET["sourceFilesSha256"][str(path.relative_to(ROOT))]

core = json.loads(CORE.read_text())
source = next(lesson for lesson in core["lessons"] if lesson["n"] == 27)
reading = json.loads(PRACTICE.read_text())["spanish-basics"]["27"]["reading"]
assert PACKET["stableLessonId"] == "french-basics:27"
assert PACKET["sourceObjectiveEnglish"] == source["objective"]
assert PACKET["sourceSpeakingEnglish"] == source["speaking"]
assert PACKET["sourceReaderTitleSpanish"] == reading["title"]
assert len(PACKET["cards"]) == len(source["words"]) == 14
assert len(PACKET["reader"]) == len(reading["target"]) == len(reading["native"]) == 6

for index, (row, exact) in enumerate(zip(PACKET["cards"], source["words"]), 1):
    assert row["id"] == f"french-basics:27:card:{index}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (
        exact["es"], exact["en"], exact["kind"]
    )
    assert row["selectedFrench"] is None
    assert isinstance(row["proposedFrench"], str) and row["proposedFrench"]
    assert row["decisionRequired"] == (index in (3, 8))

for index, (row, target, native) in enumerate(zip(PACKET["reader"], reading["target"], reading["native"]), 1):
    assert row["id"] == f"french-basics:27:reader:{index}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (target, native)
    assert row["selectedFrench"] is None
    assert isinstance(row["proposedFrench"], str) and row["proposedFrench"]

assert set(PACKET["candidateModes"]) == {"see", "recall", "hear", "type", "say", "write"}
for mode in PACKET["candidateModes"].values():
    assert mode["readyForLearner"] is False
    assert mode["targetText"] in [row["proposedFrench"] for row in PACKET["reader"]]
assert PACKET["candidateModes"]["hear"]["recordedAudio"] is False
assert len(PACKET["candidateForms"]) == 8
assert all(form["reviewed"] is False and form["readyForLearner"] is False for form in PACKET["candidateForms"])
assert PACKET["selectedDecision"] is None
assert PACKET["sourceConflict"]["card3"] and PACKET["sourceConflict"]["card8"]
assert PACKET["gates"] and not any(PACKET["gates"].values())
print("PASS French 101 Core 27 exact source, candidate IDs, unresolved meanings, closed gates")
