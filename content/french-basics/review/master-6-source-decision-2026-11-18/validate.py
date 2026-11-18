#!/usr/bin/env python3
"""Read-only exact-source and closed-gate validation for French 101 Master 6."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
PACKET = json.loads(Path(__file__).with_name("decision.json").read_text())
MASTER = ROOT / "src/data/core60/es/master-spanish-basics.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-4-6-redesign-draft.json"

for path in (MASTER, PRACTICE, ARCHIVE):
    expected = PACKET["sourceFilesSha256"][str(path.relative_to(ROOT))]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, path

source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 6)
reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["6"]["reading"]
archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 6)
assert PACKET["schema"] == "french101-master6-source-decision-v1"
assert PACKET["moduleId"] == "master-french-basics"
assert PACKET["stableLessonId"] == "master-french-basics:6"
assert PACKET["stablePairId"] == "master-french-basics:6:fr-en"
for key, source_key in (("sourceTitleEnglish", "title"), ("sourceObjectiveEnglish", "objective"),
                        ("sourceFocusEnglish", "focus"), ("sourceSpeakingEnglish", "speaking"),
                        ("sourceGrammarEnglish", "grammar")):
    assert PACKET[key] == source[source_key], key
assert PACKET["sourceReaderTitleSpanish"] == reading["title"]
assert len(PACKET["cards"]) == len(source["words"]) == 20
assert len(PACKET["reader"]) == len(reading["target"]) == len(reading["native"]) == 12

for i, (row, exact) in enumerate(zip(PACKET["cards"], source["words"]), 1):
    assert row["id"] == f"master-french-basics:6:card:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (
        exact["es"], exact["en"], exact["kind"])
    assert row["selectedFrench"] is None and row["proposedFrench"]
    assert row["decisionRequired"] == (i in (5, 6, 7, 10, 13))

for i, (row, es, en) in enumerate(zip(PACKET["reader"], reading["target"], reading["native"]), 1):
    assert row["id"] == f"master-french-basics:6:reader:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
    assert row["selectedFrench"] is None and row["proposedFrench"]

archive_ref = PACKET["conditionalArchivedRedesign"]
assert archive_ref["titleFrench"] == archived["title"]
assert archive_ref["objectiveEnglish"] == archived["objective"]
assert archive_ref["sourceMeaningAligned"] is False
assert archived["objective"] != source["objective"]
private_ref = PACKET["conditionalSourceAlignedCandidate"]
private = Path(private_ref["path"])
if private.exists():
    assert hashlib.sha256(private.read_bytes()).hexdigest() == private_ref["sha256"]

assert set(PACKET["candidateModes"]) == {"see", "recall", "hear", "type", "say", "write"}
by_id = {row["id"]: row for row in PACKET["cards"] + PACKET["reader"]}
for name, mode in PACKET["candidateModes"].items():
    assert mode["reviewKey"] == f"master-french-basics:6:mode:{name}"
    assert mode["sourceRef"] in by_id
    assert mode["sourceEnglish"] == by_id[mode["sourceRef"]]["sourceEnglish"]
    assert mode["proposedTargetText"] == by_id[mode["sourceRef"]]["proposedFrench"]
    assert mode["readyForLearner"] is False
assert PACKET["candidateModes"]["hear"]["recordedAudio"] is False
assert len(PACKET["candidateForms"]) == 8
assert all(form["reviewed"] is False and form["readyForLearner"] is False
           for form in PACKET["candidateForms"])
assert PACKET["candidateSpeaking"] and PACKET["candidateSpeakingReadyForLearner"] is False
assert PACKET["normalCardProjectionAllowed"] is False and PACKET["selectedDecision"] is None
assert PACKET["gates"] and not any(PACKET["gates"].values())
print("PASS French 101 Master 6: 20 cards, 12 Reader turns, stable IDs, conditional proposals, closed gates")
