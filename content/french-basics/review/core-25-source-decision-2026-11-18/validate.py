#!/usr/bin/env python3
"""Read-only exact source, ID and closed-gate check for Core 25."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PACKET = json.loads(Path(__file__).with_name("decision.json").read_text())
CORE = ROOT / "src/data/spanish-basics-core.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/core-25-27-draft.json"

for path in (CORE, PRACTICE, ARCHIVE):
    assert hashlib.sha256(path.read_bytes()).hexdigest() == PACKET["sourceFilesSha256"][str(path.relative_to(ROOT))]

source = next(lesson for lesson in json.loads(CORE.read_text())["lessons"] if lesson["n"] == 25)
reading = json.loads(PRACTICE.read_text())["spanish-basics"]["25"]["reading"]
assert PACKET["stableLessonId"] == "french-basics:25"
assert (PACKET["sourceTitleEnglish"], PACKET["sourceObjectiveEnglish"], PACKET["sourceSpeakingEnglish"]) == (
    source["title"], source["objective"], source["speaking"]
)
assert PACKET["sourceReaderTitleSpanish"] == reading["title"]
assert len(PACKET["cards"]) == len(source["words"]) == 14
assert len(PACKET["reader"]) == len(reading["target"]) == len(reading["native"]) == 6

for index, (row, exact) in enumerate(zip(PACKET["cards"], source["words"]), 1):
    assert row["id"] == f"french-basics:25:card:{index}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (exact["es"], exact["en"], exact["kind"])
    assert row["selectedFrench"] is None
    assert isinstance(row["proposedFrench"], str) and row["proposedFrench"]
    assert row["decisionRequired"] == (index in (3, 4, 7, 8, 9, 11))

assert PACKET["cards"][3]["proposedFrench"] == "dans / sur / à"
assert PACKET["cards"][7]["proposedFrench"] == "mon / ma"
for index, (row, spanish, english) in enumerate(zip(PACKET["reader"], reading["target"], reading["native"]), 1):
    assert row["id"] == f"french-basics:25:reader:{index}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (spanish, english)
    assert row["selectedFrench"] is None
    assert isinstance(row["proposedFrench"], str) and row["proposedFrench"]

assert set(PACKET["candidateModes"]) == {"see", "recall", "hear", "type", "say", "write"}
assert len({mode["sourceReaderTurn"] for mode in PACKET["candidateModes"].values()}) == 6
for name, mode in PACKET["candidateModes"].items():
    assert mode["reviewKey"] == f"french-basics:25:mode:{name}"
    assert mode["readyForLearner"] is False
    assert mode["targetText"] == PACKET["reader"][mode["sourceReaderTurn"] - 1]["proposedFrench"]
assert PACKET["candidateModes"]["hear"]["recordedAudio"] is False
assert len(PACKET["candidateForms"]) == 6
for index, form in enumerate(PACKET["candidateForms"], 1):
    assert form["id"] == f"french-basics:25:form:{index}"
    assert form["sourceReaderTurn"] == index
    assert (form["englishPrompt"], form["frenchAnswer"]) == (
        PACKET["reader"][index - 1]["sourceEnglish"], PACKET["reader"][index - 1]["proposedFrench"]
    )
    assert form["reviewed"] is False and form["readyForLearner"] is False
assert PACKET["candidateSpeaking"]["reviewed"] is False
assert PACKET["candidateSpeaking"]["readyForLearner"] is False
assert PACKET["sourceConflict"]["ordinaryTwoColumnProjectionAllowed"] is False
assert PACKET["sourceConflict"]["groupedCardScoringAllowed"] is False
assert PACKET["selectedDecision"] is None
assert PACKET["gates"] and not any(PACKET["gates"].values())
print("PASS French 101 Core 25 exact source, IDs, contextual decisions and closed gates")
