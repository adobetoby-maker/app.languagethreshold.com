#!/usr/bin/env python3
"""Validate the inert Master 7 packet against the current repository source."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
packet = json.loads((HERE / "decision.json").read_text())

for entry in packet["sourceFiles"].values():
    source = ROOT / entry["path"]
    assert hashlib.sha256(source.read_bytes()).hexdigest() == entry["sha256"], source

core = json.loads((ROOT / packet["sourceFiles"]["core60"]["path"]).read_text())
practice = json.loads((ROOT / packet["sourceFiles"]["practice"]["path"]).read_text())
source_lesson = core["lessons"][6]
reading = practice["master-spanish-basics"]["7"]["reading"]
assert packet["stableLessonKey"] == "master-french-basics:7"
assert packet["sourceLesson"]["title"] == source_lesson["title"]
assert packet["sourceLesson"]["objective"] == source_lesson["objective"]
assert packet["sourceLesson"]["focus"] == source_lesson["focus"]
assert packet["sourceLesson"]["grammar"] == source_lesson["grammar"]
assert packet["sourceLesson"]["speaking"] == source_lesson["speaking"]
assert packet["sourceLesson"]["readerTitle"] == reading["title"]
assert len(packet["cards"]) == len(source_lesson["words"]) == 20
assert len(packet["reader"]) == len(reading["target"]) == len(reading["native"]) == 12
for i, (row, word) in enumerate(zip(packet["cards"], source_lesson["words"]), 1):
    assert row["reviewId"] == f"master-french-basics:7:card:{i}"
    assert row["order"] == i
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (
        word["es"], word["en"], word["kind"]
    )
    assert row["selectedFrench"] is None and row["reviewed"] is False
    assert row["savedItemId"] is None
for i, row in enumerate(packet["reader"], 1):
    assert row["reviewId"] == f"master-french-basics:7:reader:{i}"
    assert row["order"] == i
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (
        reading["target"][i - 1], reading["native"][i - 1]
    )
    assert row["selectedFrench"] is None and row["reviewed"] is False
    assert row["savedItemId"] is None
assert set(m["mode"] for m in packet["conditionalModes"]) == {
    "see", "recall", "hear", "type", "say", "write"
}
for mode in packet["conditionalModes"]:
    target = next(r for r in packet["reader"] if r["reviewId"] == mode["readerReviewId"])
    assert mode["sourceEnglish"] == target["sourceEnglish"]
    assert mode["targetCandidate"] == target["conditionalFrench"]
    assert mode["selectedPrompt"] is None and mode["selectedTarget"] is None
    assert mode["authoredForLearner"] is False
    assert mode["scoringEnabled"] is False and mode["recordedAudio"] is False
assert len(packet["conditionalForms"]) == 5
for form in packet["conditionalForms"]:
    target = next(r for r in packet["reader"] if r["reviewId"] == form["readerReviewId"])
    assert form["sourceEnglish"] == target["sourceEnglish"]
    assert form["conditionalFrench"] == target["conditionalFrench"]
    assert form["selectedFrench"] is None and form["reviewed"] is False
assert packet["conditionalSpeaking"]["selected"] is None
assert packet["conditionalSpeaking"]["reviewed"] is False
assert packet["reviewIdsAreSavedItemIds"] is False
assert packet["sourceFiles"]["divergentArchivedRedesign"]["useAsAlignedLesson"] is False
assert all(value is False for value in packet["gates"].values())
print("PASS: Master 7 source, row IDs, conditional links and all closed gates")
