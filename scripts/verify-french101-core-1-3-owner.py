#!/usr/bin/env python3
"""Check the bounded owner-only French 101 Core projection and its source pins."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-basics"

def read(name):
    return json.loads((CONTENT / name).read_text())

def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

candidate = read("private-core-1-3-owner-candidate-fr-en.json")
modes = read("private-core-1-3-mode-prompts-fr-en.json")
forms = read("private-form-practice-core-1-3-fr-en.json")
assert candidate["target"] == "French" and candidate["native"] == "English"
assert candidate["reviewed"] is False and candidate["registered"] is False
for file, expected in candidate["sourceFileSha256"].items():
    assert sha(file) == expected, file
assert candidate["sourceFile"] == modes["sourceFile"] == forms["sourceFile"]
assert candidate["sourceSha256"] == modes["sourceSha256"] == forms["sourceSha256"]
assert modes["pairKey"] == forms["pairKey"] == "French:English"
assert modes["registered"] is forms["registered"] is False
assert modes["reviewed"] is forms["reviewed"] is False
assert [lesson["n"] for lesson in candidate["lessons"]] == [1, 2, 3]
assert [lesson["lesson"] for lesson in modes["lessons"]] == [1, 2, 3]
assert [lesson["lesson"] for lesson in forms["lessons"]] == [1, 2, 3]
for lesson, mode, form in zip(candidate["lessons"], modes["lessons"], forms["lessons"]):
    n = lesson["n"]
    assert mode["stableLessonKey"] == form["stableLessonKey"] == f"french-basics:{n}"
    assert len(lesson["words"]) == 14 and len(lesson["reader"]) == 6
    assert len(mode["modes"]) == 6 and len(form["prompts"]) >= 4
    assert lesson["speaking"] and all(row["fr"] and row["en"] for row in lesson["reader"])
    assert all(card["fr"] and card["en"] for card in lesson["words"])
    for prompt in mode["modes"].values():
        assert prompt["prompt"] and prompt["targetText"]
        assert prompt.get("recordedAudio", False) is False
    for prompt in form["prompts"]:
        assert prompt["reviewed"] is False and prompt["englishPrompt"] and prompt["frenchAnswer"]
        if prompt["source"] == "aligned-reader":
            assert lesson["reader"][prompt["sourceReaderTurn"] - 1]["fr"] == prompt["frenchAnswer"]
assert modes["lessons"][2]["modes"]["write"]["prompt"].startswith("Write 'My friends")
assert "mangeons" in candidate["lessons"][1]["objective"]
print("French 101 Core 1–3 owner source, IDs, alignment and closed gates: PASS")
