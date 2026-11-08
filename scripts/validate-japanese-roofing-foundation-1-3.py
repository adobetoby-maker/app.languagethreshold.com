#!/usr/bin/env python3
"""Validate source-pinned, private Japanese Roofing Foundation 1–3 drafts."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "content/japanese-roofing/foundation-1-3-draft.json"
MODES = {"see", "recall", "hear", "type", "say", "write"}

data = json.loads(PATH.read_text())
assert (data["moduleId"], data["stageId"], data["target"], data["native"]) == (
    "roofing", "foundation-roofing", "Japanese", "English"
)
assert data["reviewed"] is False and data["registered"] is False and data["audio"] == "none"
for key, hash_key in (("curriculumPath", "curriculumSha256"), ("readerPath", "readerSha256")):
    assert hashlib.sha256((ROOT / data["source"][key]).read_bytes()).hexdigest() == data["source"][hash_key]
curriculum = (ROOT / data["source"]["curriculumPath"]).read_text()
assert [lesson["n"] for lesson in data["lessons"]] == [1, 2, 3]
for lesson in data["lessons"]:
    n = lesson["n"]
    assert lesson["stableId"] == f"foundation-roofing:{n}:ja-en"
    assert lesson["sourceEnglishObjective"] in curriculum
    assert len(lesson["cards"]) >= 10 and len(lesson["reader"]) >= 7
    assert set(lesson["modes"]) == MODES
    assert all(isinstance(value, str) and value.strip() for value in lesson["modes"].values())
    assert all(card["ja"].strip() and card["en"].strip() for card in lesson["cards"])
    assert all(line["ja"].strip() and line["en"].strip() for line in lesson["reader"])
    assert len({line["ja"] for line in lesson["reader"]}) == len(lesson["reader"])
    assert lesson["speaking"]["opening"].strip() and lesson["speaking"]["goal"].strip()
    assert all(form["contextJa"] in {line["ja"] for line in lesson["reader"]} for form in lesson["forms"])
    assert all(form["contextEn"] in {line["en"] for line in lesson["reader"]} for form in lesson["forms"])
assert all(value is False for value in data["reviewGates"].values())
print("Japanese Roofing Foundation 1–3 private draft: source hashes, IDs, pairs and gates pass")
