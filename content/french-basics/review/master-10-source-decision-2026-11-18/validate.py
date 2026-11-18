#!/usr/bin/env python3
"""Check the exact source, stage-local identities, and closed gates of Master 10."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
PACKET = json.loads(Path(__file__).with_name("decision.json").read_text())
MASTER = ROOT / "src/data/core60/es/master-spanish-basics.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-10-12-redesign-draft.json"

for path in (MASTER, PRACTICE, ARCHIVE):
    assert hashlib.sha256(path.read_bytes()).hexdigest() == PACKET["sourceFilesSha256"][str(path.relative_to(ROOT))]
source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 10)
reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["10"]["reading"]
archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 10)
assert PACKET["schema"] == "french101-master10-source-decision-v1"
assert PACKET["pairKey"] == "French:English"
assert PACKET["stableLessonId"] == "master-french-basics:10"
assert PACKET["stablePairId"] == "master-french-basics:10:fr-en"
for packet_key, source_key in (("sourceTitleEnglish", "title"), ("sourceObjectiveEnglish", "objective"),
                               ("sourceFocusEnglish", "focus"), ("sourceSpeakingEnglish", "speaking"),
                               ("sourceGrammarEnglish", "grammar")):
    assert PACKET[packet_key] == source[source_key], packet_key
assert PACKET["sourceReaderTitleSpanish"] == reading["title"]
assert len(PACKET["cards"]) == len(source["words"]) == 20
assert len(PACKET["reader"]) == len(reading["target"]) == len(reading["native"]) == 12

for i, (row, exact) in enumerate(zip(PACKET["cards"], source["words"]), 1):
    assert row["id"] == f"master-french-basics:10:card:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (
        exact["es"], exact["en"], exact["kind"])
    assert row["proposedFrench"] and row["selectedFrench"] is None
    assert row["decisionRequired"] == (i in (2, 5, 6, 8, 10, 11, 17, 19))
for i, (row, es, en) in enumerate(zip(PACKET["reader"], reading["target"], reading["native"]), 1):
    assert row["id"] == f"master-french-basics:10:reader:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
    assert row["proposedFrench"] and row["selectedFrench"] is None
assert PACKET["cards"][18]["proposedFrench"] == PACKET["reader"][6]["proposedFrench"]
assert "salle de classe" in PACKET["reader"][6]["proposedFrench"]

archive_ref = PACKET["conditionalArchivedRedesign"]
assert (archive_ref["titleFrench"], archive_ref["objectiveEnglish"]) == (
    archived["title"], archived["objective"])
assert archive_ref["sourceMeaningAligned"] is False
assert archived["objective"] != source["objective"]

assert set(PACKET["candidateModes"]) == {"see", "recall", "hear", "type", "say", "write"}
by_id = {row["id"]: row for row in PACKET["cards"] + PACKET["reader"]}
for name, mode in PACKET["candidateModes"].items():
    assert mode["reviewKey"] == f"master-french-basics:10:mode:{name}"
    assert mode["sourceRefs"] and all(ref in by_id for ref in mode["sourceRefs"])
    assert not mode["readyForLearner"] and not mode["recordedAudio"]
    assert all(by_id[ref]["proposedFrench"] in mode["proposedTargetText"] for ref in mode["sourceRefs"])
assert len(PACKET["candidateForms"]) == 8
for form in PACKET["candidateForms"]:
    assert form["sourceCardRef"] in by_id
    assert form["proposedFrench"] and form["explanation"]
    assert not form["reviewed"] and not form["readyForLearner"]
assert not PACKET["candidateSpeaking"]["readyForLearner"]
assert PACKET["sourceConflicts"] and PACKET["normalCardProjectionAllowed"] is False
assert PACKET["selectedDecision"] is None
assert PACKET["gates"] and not any(PACKET["gates"].values())
print("PASS French 101 Master 10: 20 cards, 12 Reader turns, stable IDs, conditional proposals, closed gates")
