#!/usr/bin/env python3
"""Read-only Core 24 source, identity, and closed-gate check."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
packet = json.loads(Path(__file__).with_name("packet.json").read_text())
assert packet["schema"] == "french101-core24-inert-source-decision-v1"
assert packet["stableLessonKey"] == "french-basics:24"
assert packet["candidatePairId"] == "french-basics:24:fr-en"
source = {}
for name, digest in packet["sourceFilesSHA256"].items():
    raw = (ROOT / name).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == digest, name
    source[name] = json.loads(raw)
lesson = source["src/data/spanish-basics-core.json"]["lessons"][23]
reading = source["src/data/spanish-basics-practice.json"]["spanish-basics"]["24"]["reading"]
assert lesson["n"] == packet["lessonNumber"] == 24
assert (lesson["title"], lesson["objective"], lesson["speaking"]) == (
    packet["sourceTitleEnglish"], packet["sourceObjective"], packet["sourceSpeaking"]
)
assert reading["title"] == packet["sourceReaderTitleSpanish"]
assert len(packet["cards"]) == len(lesson["words"]) == 14
assert len(packet["reader"]) == len(reading["target"]) == len(reading["native"]) == 6
for n, (row, original) in enumerate(zip(packet["cards"], lesson["words"]), 1):
    assert row["id"] == f"french-basics:24:card:{n}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["sourceKind"]) == (
        original["es"], original["en"], original["kind"]
    )
    assert row["selectedFrench"] is None and row["scoringEnabled"] is False
for n, row in enumerate(packet["reader"], 1):
    assert row["id"] == f"french-basics:24:reader:{n}"
    assert row["sourceSpanish"] == reading["target"][n - 1]
    assert row["sourceEnglish"] == reading["native"][n - 1]
    assert row["selectedFrench"] is None
assert [row["id"] for row in packet["disputedFaces"]] == [
    f"french-basics:24:card:{n}" for n in (1, 2, 6, 8)
]
for row in packet["disputedFaces"]:
    card = next(card for card in packet["cards"] if card["id"] == row["id"])
    assert row["sourceSpanish"] == card["sourceSpanish"]
    assert row["sourceEnglish"] == card["sourceEnglish"]
    assert row["candidateFrench"] == card["candidateFrench"]
    assert row["selectedFrench"] is None and row["scoringEnabled"] is False
assert [m["name"] for m in packet["conditionalModePreviews"]] == [
    "see", "recall", "hear", "type", "say", "write"
]
for n, mode in enumerate(packet["conditionalModePreviews"], 1):
    assert mode["id"] == f"french-basics:24:mode:{mode['name']}"
    assert mode["sourceReaderTurn"] == n
    assert mode["sourceEnglish"] == packet["reader"][n - 1]["sourceEnglish"]
    assert mode["candidateTarget"] == packet["reader"][n - 1]["candidateFrench"]
    assert mode["authoredForLearner"] is False
    assert mode["recordedAudio"] is False and mode["scoringEnabled"] is False
assert packet["supplementalContrastHandling"]["sourceReaderExact"] is False
assert packet["supplementalContrastHandling"]["authoredForLearner"] is False
assert all(value is False for value in packet["gates"].values())
print("PASS French 101 Core 24 exact source, stable review IDs, conditional modes and closed gates")
