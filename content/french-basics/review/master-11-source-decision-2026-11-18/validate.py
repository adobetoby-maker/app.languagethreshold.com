#!/usr/bin/env python3
"""Independent source, identity and closed-gate checks for Master 11."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
packet = json.loads(Path(__file__).with_name("decision.json").read_text())
for path, digest in packet["sourceFilesSha256"].items():
    assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == digest, path
master = json.loads((ROOT / "src/data/core60/es/master-spanish-basics.json").read_text())
source = next(row for row in master["lessons"] if row["n"] == 11)
practice = json.loads((ROOT / "src/data/spanish-basics-practice.json").read_text())
reading = practice["master-spanish-basics"]["11"]["reading"]
archived_path = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-10-12-redesign-draft.json"
archived = next(row for row in json.loads(archived_path.read_text())["lessons"] if row["n"] == 11)

assert packet["schema"] == "french101-master11-source-decision-v1"
assert packet["pairKey"] == "French:English"
assert (packet["moduleId"], packet["stableLessonId"], packet["stablePairId"]) == (
    "master-french-basics", "master-french-basics:11", "master-french-basics:11:fr-en")
for name, key in (("sourceTitleEnglish", "title"), ("sourceObjectiveEnglish", "objective"),
                  ("sourceFocusEnglish", "focus"), ("sourceSpeakingEnglish", "speaking"),
                  ("sourceGrammarEnglish", "grammar")):
    assert packet[name] == source[key], name
assert packet["sourceReaderTitleSpanish"] == reading["title"]
assert len(packet["cards"]) == len(source["words"]) == 20
assert len(packet["reader"]) == len(reading["target"]) == len(reading["native"]) == 12

for i, (card, row) in enumerate(zip(packet["cards"], source["words"]), 1):
    assert card["id"] == f"master-french-basics:11:card:{i}"
    assert (card["sourceSpanish"], card["sourceEnglish"], card["kind"]) == (
        row["es"], row["en"], row["kind"])
    assert card["selectedFrench"] is None
for i, (turn, es, en) in enumerate(zip(packet["reader"], reading["target"], reading["native"]), 1):
    assert turn["id"] == f"master-french-basics:11:reader:{i}"
    assert (turn["sourceSpanish"], turn["sourceEnglish"]) == (es, en)
    assert turn["selectedFrench"] is None

assert [row["proposedFrench"] for row in packet["cards"][:12]] == [
    None, None, "le", None, None, None, None, "livres", None, "oui", "maison", "café"]
assert [row["proposedFrench"] for row in packet["reader"][:8]] == [
    row["proposedFrench"] for row in packet["cards"][12:]]
assert packet["conditionalArchivedRedesign"]["titleFrench"] == archived["title"]
assert packet["conditionalArchivedRedesign"]["objectiveEnglish"] == archived["objective"]
assert archived["objective"] != source["objective"]
assert packet["conditionalArchivedRedesign"]["sourceMeaningAligned"] is False
assert packet["conditionalArchivedRedesign"]["progressReuseAllowed"] is False
assert packet["conditionalArchivedRedesign"]["audioReuseAllowed"] is False
assert set(packet["conditionalModeAnchors"]) == {"see", "recall", "hear", "type", "say", "write"}
ids = {row["id"] for row in packet["cards"] + packet["reader"]}
for mode in packet["conditionalModeAnchors"].values():
    assert mode["sourceRefs"] and set(mode["sourceRefs"]) <= ids
    assert mode["selectedPrompt"] is None and mode["selectedTarget"] is None
    assert mode["readyForLearner"] is False
assert packet["candidateSpeakingEnglish"] == source["speaking"]
assert packet["selectedSpeakingFrench"] is None
assert packet["normalCardProjectionAllowed"] is False
assert packet["selectedDecision"] is None and packet["audioScripts"] is None
assert packet["gates"] and not any(packet["gates"].values())
print("PASS French 101 Master 11: 20 source cards, 12 Reader turns, IDs and all closed gates")
