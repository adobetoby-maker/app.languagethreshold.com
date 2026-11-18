#!/usr/bin/env python3
"""Read-only source and gate checks for the Core 26 decision packet."""

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

source = next(lesson for lesson in json.loads(CORE.read_text())["lessons"] if lesson["n"] == 26)
reading = json.loads(PRACTICE.read_text())["spanish-basics"]["26"]["reading"]
assert PACKET["stableLessonId"] == "french-basics:26"
assert PACKET["priorOwnerDraftStableId"] == "french-basics:26:fr-en"
assert PACKET["sourceTitleEnglish"] == source["title"]
assert PACKET["sourceObjectiveEnglish"] == source["objective"]
assert PACKET["sourceSpeakingEnglish"] == source["speaking"]
assert PACKET["sourceReaderTitleSpanish"] == reading["title"]
assert len(PACKET["cards"]) == len(source["words"]) == 14
assert len(PACKET["reader"]) == len(reading["target"]) == len(reading["native"]) == 6

for i, (row, exact) in enumerate(zip(PACKET["cards"], source["words"]), 1):
    assert row["id"] == f"french-basics:26:word:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (
        exact["es"], exact["en"], exact["kind"]
    )
    assert row["selectedFrench"] is None and row["proposedFrench"]
    assert row["decisionRequired"] == (i in (5, 6))

for i, (row, es, en) in enumerate(zip(PACKET["reader"], reading["target"], reading["native"]), 1):
    assert row["id"] == f"french-basics:26:line:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
    assert row["selectedFrench"] is None and row["proposedFrench"]
    assert row["decisionRequired"] == (i == 5)

assert PACKET["cards"][4]["sourceSpanish"] == "en"
assert PACKET["cards"][4]["sourceEnglish"] == "in / on / at"
assert PACKET["cards"][4]["proposedFrench"] == "dans / sur / à"
assert PACKET["cards"][5]["sourceSpanish"] == "profesora"
assert PACKET["reader"][4]["sourceEnglish"] == "My friends spoke with the teacher."
assert PACKET["sourceQuestions"]["card5"] and PACKET["sourceQuestions"]["card6AndReader5"]
assert "écrit" in PACKET["sourceQuestions"]["sourceGrammar"]
hear = PACKET["sourceQuestions"]["hearBinding"]
assert hear["applied"] is False and hear["oldTargetText"] == "cahier"
assert hear["newReaderTurn"] == 6 and hear["newTargetText"] == PACKET["reader"][5]["proposedFrench"]
assert hear["audioAttachedInPacket"] is False and hear["exercisedListeningMode"] is False

assert set(PACKET["candidateModes"]) == {"see", "recall", "hear", "type", "say", "write"}
available = {row["proposedFrench"] for row in PACKET["cards"] + PACKET["reader"]}
for name, mode in PACKET["candidateModes"].items():
    assert mode["id"] == f"french-basics:26:mode:{name}"
    assert mode["targetText"] in available
    assert mode["readyForLearner"] is False and mode["recordedAudio"] is False
assert len(PACKET["candidateForms"]) == 7
assert all(form["reviewed"] is False and form["readyForLearner"] is False for form in PACKET["candidateForms"])
assert PACKET["candidateSpeaking"] and PACKET["candidateSpeakingReadyForLearner"] is False
assert PACKET["selectedDecision"] is None
assert PACKET["gates"] and not any(PACKET["gates"].values())
print("PASS French 101 Core 26 exact source, IDs, conflicts, disabled Hear and closed gates")
