#!/usr/bin/env python3
"""Read-only source, identity, and closed-gate check for the Core 28 worksheet."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
packet = json.loads(Path(__file__).with_name("decision.json").read_text())
assert packet["schema"] == "french101-core28-inert-source-decision-v1"
assert packet["stableLessonKey"] == "french-basics:28"
assert packet["candidatePairId"] == "french-basics:28:fr-en"
source = {}
for name, digest in packet["sourceFilesSHA256"].items():
    path = ROOT / name
    raw = path.read_bytes() if path.exists() else subprocess.check_output(
        ["git", "show", f"HEAD:{name}"], cwd=ROOT
    )
    assert hashlib.sha256(raw).hexdigest() == digest, name
    source[name] = json.loads(raw)
lesson = source["src/data/spanish-basics-core.json"]["lessons"][27]
reading = source["src/data/spanish-basics-practice.json"]["spanish-basics"]["28"]["reading"]
assert lesson["n"] == packet["lessonNumber"] == 28
assert lesson["objective"] == packet["sourceObjective"]
assert lesson["speaking"] == packet["sourceSpeaking"]
assert len(packet["cards"]) == len(lesson["words"]) == 14
assert len(packet["reader"]) == len(reading["target"]) == len(reading["native"]) == 6
for n, (row, original) in enumerate(zip(packet["cards"], lesson["words"]), 1):
    assert row["id"] == f"french-basics:28:word:{n}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["sourceKind"]) == (
        original["es"], original["en"], original["kind"]
    )
    assert isinstance(row["candidateFrench"], str) and row["candidateFrench"]
    assert row["selectedFrench"] is None
for n, row in enumerate(packet["reader"], 1):
    assert row["id"] == f"french-basics:28:line:{n}"
    assert row["sourceSpanish"] == reading["target"][n - 1]
    assert row["sourceEnglish"] == reading["native"][n - 1]
    assert isinstance(row["candidateFrench"], str) and row["candidateFrench"]
    assert row["selectedFrench"] is None
assert [r["id"] for r in packet["disputedFaces"]] == [
    f"french-basics:28:word:{n}" for n in (5, 6, 7)
]
for row in packet["disputedFaces"]:
    card = next(c for c in packet["cards"] if c["id"] == row["id"])
    assert row["sourceSpanish"] == card["sourceSpanish"]
    assert row["sourceEnglish"] == card["sourceEnglish"]
    assert row["candidateFrench"] == card["candidateFrench"]
    assert row["selectedFrench"] is None and row["scoringEnabled"] is False
assert {m["name"] for m in packet["conditionalModePreviews"]} == {
    "see", "recall", "hear", "type", "say", "write"
}
for mode in packet["conditionalModePreviews"]:
    turn = packet["reader"][mode["sourceReaderTurn"] - 1]
    assert mode["id"] == f"french-basics:28:mode:{mode['name']}"
    assert mode["sourceEnglish"] == turn["sourceEnglish"]
    assert mode["candidateTarget"] == turn["candidateFrench"]
    assert mode["authoredForLearner"] is False
    assert mode["recordedAudio"] is False and mode["scoringEnabled"] is False
assert packet["oldPrivateFormIdRetirement"]
assert all(v is False for v in packet["gates"].values())
print("PASS French 101 Core 28 exact source, IDs, conditional faces and closed gates")
