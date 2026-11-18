#!/usr/bin/env python3
"""Read-only source, identity and closed-gate checks for French 101 Master 9."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
PACKET = json.loads(Path(__file__).with_name("decision.json").read_text())
MASTER = ROOT / "src/data/core60/es/master-spanish-basics.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-7-9-redesign-draft.json"

for path in (MASTER, PRACTICE, ARCHIVE):
    assert hashlib.sha256(path.read_bytes()).hexdigest() == PACKET["sourceFilesSha256"][str(path.relative_to(ROOT))]

source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 9)
reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["9"]["reading"]
archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 9)
assert PACKET["schema"] == "french101-master9-source-decision-v1"
assert PACKET["moduleId"] == "master-french-basics"
assert PACKET["stableLessonId"] == "master-french-basics:9"
assert PACKET["stablePairId"] == "master-french-basics:9:fr-en"
for key, source_key in (("sourceTitleEnglish", "title"), ("sourceObjectiveEnglish", "objective"),
                        ("sourceFocusEnglish", "focus"), ("sourceSpeakingEnglish", "speaking"),
                        ("sourceGrammarEnglish", "grammar")):
    assert PACKET[key] == source[source_key], key
assert PACKET["sourceReaderTitleSpanish"] == reading["title"]
assert len(PACKET["cards"]) == len(source["words"]) == 20
assert len(PACKET["reader"]) == len(reading["target"]) == len(reading["native"]) == 12

for i, (row, exact) in enumerate(zip(PACKET["cards"], source["words"]), 1):
    assert row["id"] == f"master-french-basics:9:card:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (
        exact["es"], exact["en"], exact["kind"])
    assert row["selectedFrench"] is None and row["proposedFrench"]
    assert row["decisionRequired"] == (i in (1, 2, 4, 7, 9, 11, 20))

for i, (row, es, en) in enumerate(zip(PACKET["reader"], reading["target"], reading["native"]), 1):
    assert row["id"] == f"master-french-basics:9:reader:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
    assert row["selectedFrench"] is None and row["proposedFrench"]

arch_ref = PACKET["conditionalArchivedRedesign"]
assert (arch_ref["titleFrench"], arch_ref["objectiveEnglish"]) == (
    archived["title"], archived["objective"])
assert arch_ref["sourceMeaningAligned"] is False and archived["objective"] != source["objective"]

assert set(PACKET["candidateModes"]) == {"see", "recall", "hear", "type", "say", "write"}
by_id = {row["id"]: row for row in PACKET["cards"] + PACKET["reader"]}
for name, mode in PACKET["candidateModes"].items():
    assert mode["reviewKey"] == f"master-french-basics:9:mode:{name}"
    assert mode["sourceRefs"] and all(ref in by_id for ref in mode["sourceRefs"])
    assert mode["readyForLearner"] is False and mode["recordedAudio"] is False
    assert all(by_id[ref]["proposedFrench"] in mode["proposedTargetText"] for ref in mode["sourceRefs"])

assert len(PACKET["candidateForms"]) == 7
for form in PACKET["candidateForms"]:
    assert form["reviewed"] is False and form["readyForLearner"] is False
    assert form["readerRefs"]
    assert all(ref in by_id for ref in form["readerRefs"] + form["phraseCardRefs"] + form["headwordCardRefs"])
    assert any((form["proposedFrench"], form["sourceEnglish"]) == (
        by_id[ref]["proposedFrench"], by_id[ref]["sourceEnglish"]) for ref in form["readerRefs"])
assert PACKET["candidateSpeaking"] and PACKET["candidateSpeakingReadyForLearner"] is False
assert PACKET["normalCardProjectionAllowed"] is False and PACKET["selectedDecision"] is None
assert PACKET["gates"] and not any(PACKET["gates"].values())
print("PASS French 101 Master 9: 20 cards, 12 Reader turns, stable IDs, conditional proposals, closed gates")
