#!/usr/bin/env python3
"""Independently check Roofing Foundation 5 source anchors and closed gates."""

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
packet = json.loads((HERE / "packet.json").read_text())
assert packet["kind"] == "inert-source-review"
assert packet["pair"] == {"target": "Japanese", "native": "English"}
assert packet["stageId"] == "foundation-roofing"
assert packet["lessonId"] == "foundation-roofing:5:ja-en"
assert packet["reviewed"] is packet["registered"] is packet["audioRegistered"] is False
assert packet["reviewGates"] and all(value is False for value in packet["reviewGates"].values())
for name, source in packet["source"].items():
    assert hashlib.sha256((ROOT / source["path"]).read_bytes()).hexdigest() == source["sha256"], name
curriculum = (ROOT / packet["source"]["curriculum"]["path"]).read_text()
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[48:60]
reader_source = json.loads((ROOT / packet["source"]["reader"]["path"]).read_text())["lessons"]["5"]["passage"]
archived = json.loads((ROOT / packet["source"]["archivedDraft"]["path"]).read_text())["lessons"][1]
assert len(packet["cards"]) == len(words) == len(archived["cards"]) == 12
assert len(packet["reader"]) == len(reader_source["target"]) == len(reader_source["native"]) == len(archived["reader"]) == 7
assert packet["sourceEnglishObjective"] == archived["sourceEnglishObjective"]
for n, (row, (es, en), draft) in enumerate(zip(packet["cards"], words, archived["cards"]), 1):
    assert (row["id"], row["legacySourceRef"]) == (
        f"foundation-roofing:5:ja-en:card:{n}", f"foundation-roofing:5:ja-en:cards:{n}")
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
    assert (row["archivedJapanese"], row["archivedEnglish"]) == (draft["ja"], draft["en"])
    assert row["reviewed"] is False
for n, (row, draft) in enumerate(zip(packet["reader"], archived["reader"]), 1):
    assert (row["id"], row["legacySourceRef"]) == (
        f"foundation-roofing:5:ja-en:line:{n}", f"foundation-roofing:5:ja-en:reader:{n}")
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (
        reader_source["target"][n-1], reader_source["native"][n-1])
    assert (row["archivedJapanese"], row["archivedEnglish"]) == (draft["ja"], draft["en"])
    assert row["reviewed"] is False
assert [n for n, row in enumerate(packet["cards"], 1) if row["candidateJapanese"] is None] == [8, 9]
assert [n for n, row in enumerate(packet["reader"], 1) if row["candidateJapanese"] is None] == [5]
assert all(row["reviewNote"] for row in packet["cards"] if row["candidateJapanese"] is None)
assert all(row["reviewNote"] for row in packet["reader"] if row["candidateJapanese"] is None)
assert "ir a + verb" in packet["curriculumAdaptationNote"]
assert set(packet["archivedModeLabels"]) == {"see", "recall", "hear", "type", "say", "write"}
assert all(not m["authoredPromptTargetPair"] and not m["readyForLearner"]
           for m in packet["archivedModeLabels"].values())
print("PASS Japanese Roofing Foundation 5 exact source, IDs, three null faces and closed gates")
