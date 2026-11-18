#!/usr/bin/env python3
"""Independent source, identity and closed-gate check for Foundation 7."""
import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[4]
data = json.loads(Path(__file__).with_name("decision.json").read_text())
assert data["pair"] == {"target": "English", "native": "French"}
assert data["sourceModuleId"] == "foundation-roofing"
assert data["archivedHeaderModuleId"] == "roofing"
assert data["proposedStageLocalLessonId"] == "foundation-roofing:7:fr-en"
for item in data["source"].values():
    assert hashlib.sha256((root / item["path"]).read_bytes()).hexdigest() == item["sha256"]
curriculum = (root / data["source"]["curriculum"]["path"]).read_text()
source_cards = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[72:84]
source_lesson = json.loads((root / data["source"]["reader"]["path"]).read_text())["lessons"]["7"]
passage = source_lesson["passage"]
rows = {"cards": source_cards, "readerSpanish": passage["target"], "readerEnglish": passage["native"]}
assert hashlib.sha256(json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest() == data["sourceRowsSha256"]
assert len(data["cards"]) == 12
assert [(x["sourceSpanish"], x["sourceEnglish"]) for x in data["cards"]] == source_cards
assert len(data["reader"]) == 7
assert [(x["sourceSpanish"], x["sourceEnglish"]) for x in data["reader"]] == list(zip(passage["target"], passage["native"]))
assert data["sourceVerbExamples"] == source_lesson["verbs"]
assert [x["proposedRowId"] for x in data["cards"]] == [f"foundation-roofing:7:fr-en:card:{i}" for i in range(1, 13)]
assert [x["proposedRowId"] for x in data["reader"]] == [f"foundation-roofing:7:fr-en:line:{i}" for i in range(1, 8)]
assert [x["sourcePosition"] for x in data["cards"]] == list(range(1, 13))
assert [x["sourcePosition"] for x in data["reader"]] == list(range(1, 8))
assert all(x["selectedFrench"] is None and x["audioScript"] is None and x["reviewed"] is False for x in data["cards"] + data["reader"])
assert all(data["cards"][i - 1]["conditionalFrench"] is None for i in (1, 5, 8, 10, 11))
assert all(data["reader"][i - 1]["conditionalFrench"] is None for i in (1, 2, 4, 5))
assert set(data["modeEvidence"]) == {"see", "recall", "hear", "type", "say", "write"}
assert all(not x["readyForLearner"] and not x["authoredPromptTargetPair"] for x in data["modeEvidence"].values())
assert data["audioScript"] is None and not any(data["reviewGates"].values())
assert data["reviewed"] is False and data["registered"] is False and data["audioRegistered"] is False
print("PASS Foundation 7: 12 exact cards, 7 Reader turns, source hashes, stage IDs, 9 held faces and closed gates")
