#!/usr/bin/env python3
"""Independently check source anchors, row IDs, nulls and release gates."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
packet = json.loads((HERE / "packet.json").read_text())
assert packet["kind"] == "inert-source-review"
assert packet["pair"] == {"target": "Japanese", "native": "English"}
assert packet["lessonId"] == "foundation-roofing:3:ja-en"
assert packet["reviewed"] is packet["registered"] is packet["audioRegistered"] is False
assert all(value is False for value in packet["reviewGates"].values())
for name, source in packet["source"].items():
    assert hashlib.sha256((ROOT / source["path"]).read_bytes()).hexdigest() == source["sha256"], name
curriculum = (ROOT / packet["source"]["curriculum"]["path"]).read_text()
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[24:36]
reader_source = json.loads((ROOT / packet["source"]["reader"]["path"]).read_text())["lessons"]["3"]["passage"]
assert len(packet["cards"]) == len(words) == 12
assert len(packet["reader"]) == len(reader_source["target"]) == len(reader_source["native"]) == 7
for n, (row, (es, en)) in enumerate(zip(packet["cards"], words), 1):
    assert (row["id"], row["legacySourceRef"]) == (
        f"foundation-roofing:3:ja-en:card:{n}", f"foundation-roofing:3:ja-en:cards:{n}")
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
    assert row["reviewed"] is False
for n, row in enumerate(packet["reader"], 1):
    assert (row["id"], row["legacySourceRef"]) == (
        f"foundation-roofing:3:ja-en:line:{n}", f"foundation-roofing:3:ja-en:reader:{n}")
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (
        reader_source["target"][n-1], reader_source["native"][n-1])
    assert row["reviewed"] is False
assert [n for n, row in enumerate(packet["cards"], 1) if row["candidateJapanese"] is None] == [6, 7, 8]
assert [n for n, row in enumerate(packet["reader"], 1) if row["candidateJapanese"] is None] == [1, 7]
assert packet["reader"][4]["candidateJapanese"] == "午後二時には屋根が熱いです。"
assert set(packet["archivedModeLabels"]) == {"see", "recall", "hear", "type", "say", "write"}
assert all(not m["authoredPromptTargetPair"] and not m["readyForLearner"]
           for m in packet["archivedModeLabels"].values())
print("PASS Japanese Roofing Foundation 3 source anchors, row IDs, null conflicts and closed gates")
