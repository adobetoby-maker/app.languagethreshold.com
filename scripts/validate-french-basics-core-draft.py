#!/usr/bin/env python3
"""Check French 101 Core 1–3 draft against its exact English source."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "content/french-basics/source-english-core-1-3.json"
DRAFT_PATH = ROOT / "content/french-basics/core-1-3-draft.json"
source = json.loads(SOURCE_PATH.read_text())
draft = json.loads(DRAFT_PATH.read_text())

assert draft["target"] == "French" and draft["native"] == "English"
assert draft["moduleId"] == "french-basics" and draft["stage"] == "core"
assert draft["reviewed"] is False and draft["state"] == "authored-draft"
assert draft["source"]["sourceSha256"] == hashlib.sha256(SOURCE_PATH.read_bytes()).hexdigest()
assert len(source["lessons"]) == len(draft["lessons"]) == 3

for path in source["sourcePaths"]:
    assert source["sourceSha256"][path] == hashlib.sha256((ROOT / path).read_bytes()).hexdigest(), path
assert draft["source"]["sourceFileSha256"] == source["sourceSha256"]

core = json.loads((ROOT / "src/data/spanish-basics-core.json").read_text())
practice = json.loads((ROOT / "src/data/spanish-basics-practice.json").read_text())["spanish-basics"]
for number, (english, lesson) in enumerate(zip(source["lessons"], draft["lessons"]), 1):
    assert english["n"] == lesson["n"] == number
    assert english["objective"] == core["lessons"][number - 1]["objective"]
    assert english["words"] == core["lessons"][number - 1]["words"]
    assert english["reading"] == practice[str(number)]["reading"]
    assert lesson["sourceObjectiveEnglish"] == english["objective"]
    assert lesson["sourceTitleEnglish"] == english["title"]
    assert lesson["locale"] == "fr-FR"
    for field in ("title", "objective", "focus", "scene", "speaking"):
        assert lesson[field].strip(), (number, field)
    assert lesson["grammar"]["explanation"].strip()
    assert len(lesson["words"]) == len(english["words"]) == 14
    for word, original in zip(lesson["words"], english["words"]):
        assert word["fr"].strip() and word["en"] == original["en"]
        assert word["kind"] == original["kind"]
    assert len({word["fr"] for word in lesson["words"]}) == 14
    reading = lesson["reading"]
    assert reading["native"] == english["reading"]["native"]
    assert len(reading["target"]) == len(reading["native"]) == 6
    assert all(line.strip() for line in reading["target"])
    assert len(lesson["dialogue"]) >= 6
    assert all(line.count("|") == 1 and all(part.strip() for part in line.split("|")) for line in lesson["dialogue"])
    types = {check["type"] for check in lesson["checks"]}
    assert {"recall", "write", "listening", "comprehension"} <= types
    for check in lesson["checks"]:
        assert check["prompt"].strip() and check["answer"].strip()
        if check["type"] == "listening":
            assert check["audioText"].strip() and check["locale"] == "fr-FR"
            assert check["voiceStatus"] == "script-only; no recorded audio"

# The source English says Spanish here; the French translations must preserve
# that meaning rather than silently changing the activity to French.
assert "l'espagnol" in draft["lessons"][0]["words"][8]["fr"]
assert "espagnol" in draft["lessons"][2]["words"][10]["fr"]
print("French 101 Core 1–3: 42 English card pairs, 18 aligned reading meanings, source hashes and structure valid; no review/runtime/audio claim")
