#!/usr/bin/env python3
"""Read-only current source, worksheet ID and closed-gate check for Master 2."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PACKET = json.loads(Path(__file__).with_name("decision.json").read_text())
CORE = ROOT / "src/data/core60/es/master-spanish-basics.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-1-3-draft.json"

for path in (CORE, PRACTICE, ARCHIVE):
    assert hashlib.sha256(path.read_bytes()).hexdigest() == PACKET["sourceFilesSha256"][str(path.relative_to(ROOT))]

source = next(lesson for lesson in json.loads(CORE.read_text())["lessons"] if lesson["n"] == 2)
reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["2"]["reading"]
assert PACKET["stableLessonId"] == "master-french-basics:2"
assert PACKET["pairLessonId"] == "master-french-basics:2:fr-en"
assert PACKET["reviewIdsAreSavedItemIds"] is False
assert (PACKET["sourceTitleEnglish"], PACKET["sourceObjectiveEnglish"], PACKET["sourceSpeakingEnglish"]) == (
    source["title"], source["objective"], source["speaking"]
)
assert PACKET["sourceReaderTitleSpanish"] == reading["title"]
assert len(PACKET["cards"]) == len(source["words"]) == 20
assert len(PACKET["reader"]) == len(reading["target"]) == len(reading["native"]) == 12

for index, (row, exact) in enumerate(zip(PACKET["cards"], source["words"]), 1):
    assert row["reviewId"] == f"master-french-basics:2:card:{index}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (exact["es"], exact["en"], exact["kind"])
    assert row["selectedFrench"] is None
    assert isinstance(row["proposedFrench"], str) and row["proposedFrench"]
    assert row["decisionRequired"] == (index in (6, 7, 8, 11))

assert PACKET["cards"][6]["proposedFrench"] == PACKET["cards"][7]["proposedFrench"] == "est"
assert "se trouve" not in PACKET["cards"][7]["proposedFrench"]
for index, (row, spanish, english) in enumerate(zip(PACKET["reader"], reading["target"], reading["native"]), 1):
    assert row["reviewId"] == f"master-french-basics:2:reader:{index}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (spanish, english)
    assert row["selectedFrench"] is None
    assert isinstance(row["proposedFrench"], str) and row["proposedFrench"]

assert set(PACKET["candidateModes"]) == {"see", "recall", "hear", "type", "say", "write"}
for name, mode in PACKET["candidateModes"].items():
    assert mode["reviewKey"] == f"master-french-basics:2:mode:{name}"
    assert mode["readyForLearner"] is False and mode["scoringEnabled"] is False
assert PACKET["candidateModes"]["hear"]["recordedAudio"] is False
assert len(PACKET["candidateForms"]) == 5
for index, form in enumerate(PACKET["candidateForms"], 1):
    assert form["reviewId"] == f"master-french-basics:2:form:{index}"
    assert (form["englishPrompt"], form["frenchAnswer"]) == (
        PACKET["reader"][form["sourceReaderTurn"] - 1]["sourceEnglish"],
        PACKET["reader"][form["sourceReaderTurn"] - 1]["proposedFrench"],
    )
    assert form["reviewed"] is False and form["readyForLearner"] is False
assert PACKET["candidateSpeaking"]["reviewed"] is False
assert PACKET["candidateSpeaking"]["readyForLearner"] is False
assert PACKET["ownerVisibleScopeProposal"]["7"]["identityExample"] is None
assert PACKET["ownerVisibleScopeProposal"]["8"]["conditionExample"] is None
assert PACKET["sourceConflict"]["ordinaryTwoColumnProjectionAllowed"] is False
assert PACKET["sourceConflict"]["contextFreeScoringAllowed"] is False
assert PACKET["sourceConflict"]["recordedHearAvailable"] is False
assert PACKET["modeGaps"] and PACKET["selectedDecision"] is None
assert PACKET["gates"] and not any(PACKET["gates"].values())
print("PASS French 101 Master 2 exact source, review IDs, meaning gaps and closed gates")
