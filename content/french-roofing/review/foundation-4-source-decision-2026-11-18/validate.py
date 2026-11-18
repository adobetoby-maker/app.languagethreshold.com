#!/usr/bin/env python3
"""Independent source, identity and closed-gate check for Foundation 4."""

import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[4]
data = json.loads(Path(__file__).with_name("decision.json").read_text())
assert data["pair"] == {"target": "English", "native": "French"}
assert data["sourceModuleId"] == "foundation-roofing"
assert data["archivedHeaderModuleId"] == "roofing"
assert data["proposedStageLocalLessonId"] == "foundation-roofing:4:fr-en"
for item in data["source"].values():
    path = root / item["path"]
    assert path.is_file()
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"]
curriculum = (root / data["source"]["curriculum"]["path"]).read_text()
source_cards = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)
assert len(data["cards"]) == 12
assert [(c["sourceSpanish"], c["sourceEnglish"]) for c in data["cards"]] == source_cards[36:48]
source = json.loads((root / data["source"]["reader"]["path"]).read_text())["lessons"]["4"]["passage"]
assert len(data["reader"]) == 7
assert [(r["sourceSpanish"], r["sourceEnglish"]) for r in data["reader"]] == list(zip(source["target"], source["native"]))
assert [c["proposedRowId"] for c in data["cards"]] == [f"foundation-roofing:4:fr-en:card:{n}" for n in range(1, 13)]
assert [r["proposedRowId"] for r in data["reader"]] == [f"foundation-roofing:4:fr-en:line:{n}" for n in range(1, 8)]
assert all(c["selectedFrench"] is None and c["reviewed"] is False for c in data["cards"])
assert all(r["selectedFrench"] is None and r["reviewed"] is False for r in data["reader"])
assert [n for n, c in enumerate(data["cards"], 1) if c["conditionalFrench"] is None] == [5, 6, 12]
assert [n for n, r in enumerate(data["reader"], 1) if r["conditionalFrench"] is None] == [3, 5, 6]
assert set(data["modeEvidence"]) == {"see", "recall", "hear", "type", "say", "write"}
assert all(not mode["readyForLearner"] and not mode["authoredPromptTargetPair"] for mode in data["modeEvidence"].values())
assert data["audioScript"] is None
assert not any(data["reviewGates"].values())
assert data["reviewed"] is False and data["registered"] is False and data["audioRegistered"] is False
print("PASS French Roofing Foundation 4 source, stage IDs, six held faces and closed gates")
