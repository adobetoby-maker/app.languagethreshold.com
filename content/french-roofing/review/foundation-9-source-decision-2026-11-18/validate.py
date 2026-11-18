#!/usr/bin/env python3
"""Independently check Foundation 9 source, identity and closed release gates."""
import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[4]
data = json.loads(Path(__file__).with_name("decision.json").read_text())
assert data["pair"] == {"target": "French", "native": "English"}
assert data["sourceModuleId"] == "foundation-roofing"
assert data["archivedHeaderModuleId"] == "roofing"
assert data["proposedStageLocalLessonId"] == "foundation-roofing:9:fr-en"
for item in data["source"].values():
    assert hashlib.sha256((root / item["path"]).read_bytes()).hexdigest() == item["sha256"]
curriculum = (root / data["source"]["curriculum"]["path"]).read_text()
source_cards = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[96:108]
assert all(value in curriculum for value in (data["sourceTitleEnglish"], data["sourceObjectiveEnglish"], data["sourceFocusEnglish"], data["sourceSpeakingEnglish"]))
assert 't("espere", "wait", "usted command of esperar")' in curriculum
assert 't("venga", "come", "usted command of venir")' in curriculum
source_lesson = json.loads((root / data["source"]["reader"]["path"]).read_text())["lessons"]["9"]
passage = source_lesson["passage"]
rows = {"cards": source_cards, "readerSpanish": passage["target"], "readerEnglish": passage["native"]}
assert hashlib.sha256(json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest() == data["sourceRowsSha256"]
archive = json.loads((root / data["source"]["archivedDraft"]["path"]).read_text())
assert archive["moduleId"] == "roofing" and archive["stage"] == "foundation"
draft = archive["lessons"][2]
assert draft["n"] == 9
assert len(data["cards"]) == 12
assert [(x["sourceSpanish"], x["sourceEnglish"]) for x in data["cards"]] == source_cards
assert [x["archivedFrench"] for x in data["cards"]] == [x["fr"] for x in draft["words"]]
assert len(data["reader"]) == 6
assert [(x["sourceSpanish"], x["sourceEnglish"]) for x in data["reader"]] == list(zip(passage["target"], passage["native"]))
assert [x["archivedFrench"] for x in data["reader"]] == draft["reading"]["target"]
assert data["sourceVerbExamples"] == source_lesson["verbs"]
assert [x["proposedRowId"] for x in data["cards"]] == [f"foundation-roofing:9:fr-en:card:{i}" for i in range(1, 13)]
assert [x["proposedRowId"] for x in data["reader"]] == [f"foundation-roofing:9:fr-en:line:{i}" for i in range(1, 7)]
assert [x["sourcePosition"] for x in data["cards"]] == list(range(1, 13))
assert [x["sourcePosition"] for x in data["reader"]] == list(range(1, 7))
assert all(x["selectedFrench"] is None and x["audioScript"] is None and x["reviewed"] is False for x in data["cards"] + data["reader"])
assert all(data["cards"][i - 1]["conditionalFrench"] is None for i in (4, 5))
assert all(data["reader"][i - 1]["conditionalFrench"] is None for i in (3, 6))
assert set(data["modeEvidence"]) == {"see", "recall", "hear", "type", "say", "write"}
assert all(not x["readyForLearner"] and not x["authoredPromptTargetPair"] for x in data["modeEvidence"].values())
assert data["audioScript"] is None and not any(data["reviewGates"].values())
assert data["reviewed"] is False and data["registered"] is False and data["audioRegistered"] is False
print("PASS Foundation 9: 12 exact cards, 6 Reader turns, source hashes, stage IDs, 4 held faces and closed gates")
