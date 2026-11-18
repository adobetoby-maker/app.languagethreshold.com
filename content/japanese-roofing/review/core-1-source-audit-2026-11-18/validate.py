#!/usr/bin/env python3
"""Check source pins, ordered pairs, stable IDs and closed gates."""

import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
subprocess.run(["python3", str(HERE / "build.py"), "--check"], check=True, cwd=ROOT)
p = json.loads((HERE / "packet.json").read_text())
assert p["kind"] == "inert-source-review" and p["lessonId"] == "roofing:1:ja-en"
assert p["stageId"] == "roofing" and p["pair"] == {"target": "Japanese", "native": "English"}
assert len(p["cards"]) == 15 and len(p["reader"]) == 8
for name, pin in p["source"].items():
    assert hashlib.sha256((ROOT / pin["path"]).read_bytes()).hexdigest() == pin["sha256"], name
for kind, suffix in [("cards", "card"), ("reader", "line")]:
    for n, row in enumerate(p[kind], 1):
        assert row["id"] == f"roofing:1:ja-en:{suffix}:{n}"
        assert row["selectedJapanese"] is None and row["reviewed"] is False
        assert row["sourceSpanish"] and row["sourceEnglish"]
        if row["reviewNote"]:
            assert row["candidateJapanese"] is None
assert all(not v for v in p["reviewGates"].values())
assert p["audioScript"] is None
assert p["reviewed"] is False and p["registered"] is False and p["audioRegistered"] is False
assert set(p["archivedModeLabels"]) == {"see", "recall", "hear", "type", "say", "write"}
assert all(not x["authoredPromptTargetPair"] and not x["readyForLearner"]
           for x in p["archivedModeLabels"].values())
print("PASS Japanese Roofing Core 1: 15 cards, 8 Reader lines, source pins, IDs and gates")
