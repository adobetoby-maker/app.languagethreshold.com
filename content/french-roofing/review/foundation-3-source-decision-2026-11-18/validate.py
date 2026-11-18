#!/usr/bin/env python3
"""Independent source, identity and closed-gate check for Foundation 3."""

import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[4]
data = json.loads(Path(__file__).with_name("decision.json").read_text())
prefix = "foundation-roofing:3:fr-en"
assert data["kind"] == "inert-source-decision"
assert data["pair"] == {"target": "English", "native": "French"}
assert data["sourceModuleId"] == "foundation-roofing"
assert data["archivedHeaderModuleId"] == "roofing"
assert data["proposedStageLocalLessonId"] == prefix
for source in data["source"].values():
    path = root / source["path"]
    assert path.is_file()
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source["sha256"]

curriculum = (root / data["source"]["curriculum"]["path"]).read_text()
pairs = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)
cards = data["cards"]
assert len(cards) == 12
assert [(c["sourceSpanish"], c["sourceEnglish"]) for c in cards] == pairs[24:36]
assert [c["proposedRowId"] for c in cards] == [f"{prefix}:card:{n}" for n in range(1, 13)]
assert all(c["selectedFrench"] is None and c["reviewed"] is False for c in cards)
assert cards[1]["conditionalFrench"] is None

source_lesson = json.loads((root / data["source"]["reader"]["path"]).read_text())["lessons"]["3"]
reader = data["reader"]
assert len(reader) == 7
assert [(r["sourceSpanish"], r["sourceEnglish"]) for r in reader] == list(zip(source_lesson["passage"]["target"], source_lesson["passage"]["native"]))
assert [r["proposedRowId"] for r in reader] == [f"{prefix}:line:{n}" for n in range(1, 8)]
assert all(r["selectedFrench"] is None and r["reviewed"] is False for r in reader)
assert reader[3]["conditionalFrench"] is None and reader[3]["archivedEnglishDiffersFromSource"] is True
assert reader[3]["sourceEnglish"] == "The air is cold in the morning."
assert reader[3]["archivedEnglish"] == "It's cold in the morning."
assert reader[6]["conditionalFrench"] is None
assert data["sourceVerbExamples"] == source_lesson["verbs"]
assert set(data["modeEvidence"]) == {"see", "recall", "hear", "type", "say", "write"}
assert all(not v["authoredPromptTargetPair"] and not v["readyForLearner"] for v in data["modeEvidence"].values())
assert data["speakingEvidence"]["readyForLearner"] is False
assert data["audioScript"] is None
assert not any(data["reviewGates"].values())
assert data["reviewed"] is False and data["registered"] is False and data["audioRegistered"] is False
print("PASS French Roofing Foundation 3: 12 exact cards, 7 exact Reader lines, three held French faces, stage IDs and closed gates")
