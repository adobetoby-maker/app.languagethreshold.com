#!/usr/bin/env python3
"""Read-only source, identity and closed-gate check for Core 23."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PACKET = json.loads(Path(__file__).with_name("decision.json").read_text())
CORE = ROOT / "src/data/spanish-basics-core.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/core-22-24-draft.json"

for path in (CORE, PRACTICE, ARCHIVE):
    assert hashlib.sha256(path.read_bytes()).hexdigest() == PACKET["sourceFilesSha256"][str(path.relative_to(ROOT))]

source = next(lesson for lesson in json.loads(CORE.read_text())["lessons"] if lesson["n"] == 23)
reading = json.loads(PRACTICE.read_text())["spanish-basics"]["23"]["reading"]
assert PACKET["moduleId"] == "french-basics" and PACKET["stableLessonId"] == "french-basics:23"
assert PACKET["sourceTitleEnglish"] == source["title"]
assert PACKET["sourceObjectiveEnglish"] == source["objective"]
assert PACKET["sourceSpeakingEnglish"] == source["speaking"]
assert PACKET["sourceReaderTitleSpanish"] == reading["title"]
assert len(PACKET["cards"]) == len(source["words"]) == 14
assert len(PACKET["reader"]) == len(reading["target"]) == len(reading["native"]) == 6

for i, (row, exact) in enumerate(zip(PACKET["cards"], source["words"]), 1):
    assert row["id"] == f"french-basics:23:card:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (exact["es"], exact["en"], exact["kind"])
    assert row["selectedFrench"] is None
    assert row["proposedFrench"]
    assert row["decisionRequired"] == (i == 8)

for i, (row, es, en) in enumerate(zip(PACKET["reader"], reading["target"], reading["native"]), 1):
    assert row["id"] == f"french-basics:23:reader:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
    assert row["selectedFrench"] is None
    assert row["proposedFrench"]
    assert row["decisionRequired"] == (i == 6)

assert PACKET["cards"][7]["sourceSpanish"] == "los"
assert PACKET["cards"][7]["sourceEnglish"] == "the / them (masculine plural)"
assert PACKET["cards"][7]["proposedFrench"] == "les"
assert PACKET["cards"][7]["proposedFrenchMeaningEnglish"] == "the / them (plural, any gender)"
assert PACKET["reader"][5]["sourceSpanish"] == "¿La tienes tú?"
assert PACKET["sourceConflict"]["card8"] and PACKET["sourceConflict"]["reader6"]
assert PACKET["selectedDecision"] is None

assert set(PACKET["candidateModes"]) == {"see", "recall", "hear", "type", "say", "write"}
available = {row["proposedFrench"] for row in PACKET["cards"] + PACKET["reader"]}
for name, mode in PACKET["candidateModes"].items():
    assert mode["reviewKey"] == f"french-basics:23:mode:{name}"
    assert mode["targetText"] in available
    assert mode["readyForLearner"] is False
    assert mode.get("sourceCard") or mode.get("sourceReaderTurn")
assert PACKET["candidateModes"]["hear"]["recordedAudio"] is False
assert len(PACKET["candidateForms"]) == 7
assert all(form["reviewed"] is False and form["readyForLearner"] is False for form in PACKET["candidateForms"])
assert PACKET["candidateSpeaking"]["reviewed"] is False
assert PACKET["candidateSpeaking"]["readyForLearner"] is False
assert PACKET["gates"] and not any(PACKET["gates"].values())
print("PASS French 101 Core 23 exact source, candidate links, unresolved meanings, closed gates")
