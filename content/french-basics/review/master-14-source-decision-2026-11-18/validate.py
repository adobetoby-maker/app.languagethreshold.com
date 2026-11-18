#!/usr/bin/env python3
"""Independent exact-source, stable-ID and closed-gate checks for Master 14."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PACKET = json.loads(Path(__file__).with_name("decision.json").read_text())
MASTER = ROOT / "src/data/core60/es/master-spanish-basics.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-13-15-redesign-draft.json"

for path in (MASTER, PRACTICE, ARCHIVE):
    assert hashlib.sha256(path.read_bytes()).hexdigest() == PACKET["sourceFilesSha256"][str(path.relative_to(ROOT))]
source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 14)
reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["14"]["reading"]
archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 14)
assert PACKET["schema"] == "french101-master14-source-decision-v1"
assert PACKET["pairKey"] == "French:English" and PACKET["moduleId"] == "master-french-basics"
assert PACKET["stableLessonId"] == "master-french-basics:14"
assert PACKET["stablePairId"] == "master-french-basics:14:fr-en"
assert PACKET["sourceTitleEnglish"] == source["title"]
assert PACKET["sourceObjectiveEnglish"] == source["objective"]
assert PACKET["sourceFocusEnglish"] == source["focus"]
assert PACKET["sourceSpeakingEnglish"] == source["speaking"]
assert PACKET["sourceGrammarEnglish"] == source["grammar"]
assert PACKET["sourceReaderTitleSpanish"] == reading["title"]
assert len(PACKET["cards"]) == len(source["words"]) == 20
assert len(PACKET["reader"]) == len(reading["target"]) == len(reading["native"]) == 12
assert len(PACKET["conditionalModeEvidence"]) == 6

ids = set()
for i, (row, exact) in enumerate(zip(PACKET["cards"], source["words"]), 1):
    assert row["id"] == f"master-french-basics:14:card:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (
        exact["es"], exact["en"], exact["kind"])
    assert row["selectedFrench"] is None
    ids.add(row["id"])
for i, (row, es, en) in enumerate(zip(PACKET["reader"], reading["target"], reading["native"]), 1):
    assert row["id"] == f"master-french-basics:14:reader:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
    assert row["selectedFrench"] is None
    ids.add(row["id"])
assert len(ids) == 32
assert {row["mode"] for row in PACKET["conditionalModeEvidence"]} == {"See", "Recall", "Hear", "Type", "Say", "Write"}
for row in PACKET["conditionalModeEvidence"]:
    assert row["sourceRef"] in ids and row["readyForLearner"] is False and row["recordedAudio"] is False
    matching = next(x for x in PACKET["reader"] if x["id"] == row["sourceRef"])
    assert (row["sourceEnglish"], row["conditionalFrench"]) == (matching["sourceEnglish"], matching["proposedFrench"])
for row in PACKET["conditionalFormEvidence"]:
    assert row["readyForLearner"] is False and row["sourceRefs"]
    assert all(ref in ids for ref in row["sourceRefs"])
assert PACKET["conditionalSpeakingEvidence"]["readyForLearner"] is False
assert all(ref in ids for ref in PACKET["conditionalSpeakingEvidence"]["sourceRefs"])
assert PACKET["archivedRedesign"]["title"] == archived["title"]
assert PACKET["archivedRedesign"]["separateFromCurrentSource"] is True
assert PACKET["archivedRedesign"]["title"] != PACKET["sourceTitleEnglish"]
assert PACKET["selectedDecision"] is None and PACKET["normalProjectionAllowed"] is False
assert PACKET["audioScript"] is None and PACKET["gates"] and not any(PACKET["gates"].values())
print("PASS French 101 Master 14: 20 cards, 12 Reader turns, stable IDs, conditional evidence and closed gates")
