#!/usr/bin/env python3
"""Check current source parity, stable IDs, and closed gates for Master 5."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PACKET = json.loads(Path(__file__).with_name("decision.json").read_text())
MASTER = ROOT / "src/data/core60/es/master-spanish-basics.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-4-6-redesign-draft.json"

for path in (MASTER, PRACTICE, ARCHIVE):
    rel = str(path.relative_to(ROOT))
    assert hashlib.sha256(path.read_bytes()).hexdigest() == PACKET["sourceFilesSha256"][rel], rel

source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 5)
reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["5"]["reading"]
archive = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 5)
assert archive["stableLessonKey"] == "master-french-basics:5"
assert PACKET["stableLessonId"] == "master-french-basics:5"
assert PACKET["sourceTitleEnglish"] == source["title"]
assert PACKET["sourceObjectiveEnglish"] == source["objective"]
assert PACKET["sourceSpeakingEnglish"] == source["speaking"]
assert PACKET["sourceReaderTitleSpanish"] == reading["title"]
assert len(PACKET["cards"]) == len(source["words"]) == 20
assert len(PACKET["reader"]) == len(reading["target"]) == len(reading["native"]) == 12

for i, (row, exact) in enumerate(zip(PACKET["cards"], source["words"]), 1):
    assert row["id"] == f"master-french-basics:5:card:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (
        exact["es"], exact["en"], exact["kind"]
    )
    assert row["selectedFrench"] is None and row["conditionalFrenchFromPrivateHold"]
    assert row["proposalStatus"] == "conditional-unreviewed"
    assert row["decisionRequired"] == (i in (2, 5, 8, 10, 11))

for i, (row, es, en) in enumerate(zip(PACKET["reader"], reading["target"], reading["native"]), 1):
    assert row["id"] == f"master-french-basics:5:reader:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
    assert row["selectedFrench"] is None and row["conditionalFrenchFromPrivateHold"]
    assert row["proposalStatus"] == "conditional-unreviewed"

assert PACKET["cards"][7]["sourceEnglish"] == "in / on / at"
assert PACKET["cards"][4]["sourceSpanish"] == "la"
assert PACKET["cards"][10]["sourceSpanish"] == "las"
assert PACKET["archivedFrenchEvidence"]["role"].startswith("separate divergent")
assert {row["kind"] for row in PACKET["sourceConflicts"]} >= {
    "curriculum-stage", "archive-divergence", "card-face", "lesson-assets", "dictionary-saved-items"
}
assert PACKET["candidateModes"] is None
assert PACKET["candidateForms"] is None
assert PACKET["candidateSpeaking"] is None
assert PACKET["normalCardProjectionAllowed"] is False
assert PACKET["selectedDecision"] is None
assert PACKET["gates"] and all(value is False for value in PACKET["gates"].values())
print("PASS French 101 Master 5 exact source, IDs, archive separation and closed gates")
