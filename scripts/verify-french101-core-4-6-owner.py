#!/usr/bin/env python3
"""Verify the source-pinned, owner-only French 101 Core 4–6 projection."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-basics"
NAMES = ("see", "recall", "hear", "type", "say", "write")


def read(name):
    return json.loads((CONTENT / name).read_text())


def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


candidate = read("private-core-4-6-owner-candidate-fr-en.json")
modes = read("private-core-4-6-mode-prompts-fr-en.json")
forms = read("private-form-practice-core-4-6-fr-en.json")
assert candidate["target"] == "French" and candidate["native"] == "English"
assert candidate["reviewed"] is candidate["registered"] is False
assert candidate["sourceFile"] == modes["sourceFile"] == forms["sourceFile"]
assert candidate["sourceSha256"] == modes["sourceSha256"] == forms["sourceSha256"]
assert candidate["draftFile"] == "content/french-basics/core-4-6-draft.json"
assert candidate["draftSha256"] == "38ff5172764f4658a27aa929e213a3797a37fda87b12c09696c198bee74b45dd"
assert candidate["englishSourceFile"] == "content/french-basics/source-english-core-4-6.json"
assert candidate["englishSourceSha256"] == "d05e9608a7ba35606e81c6c6fad01ea787bd35056a097317a7893dc59d53a917"
assert modes["pairKey"] == forms["pairKey"] == "French:English"
assert modes["registered"] is forms["registered"] is False
assert modes["reviewed"] is forms["reviewed"] is False
assert forms["courseId"] == "french-basics:fr-en"
for path, digest in candidate["sourceFileSha256"].items():
    assert sha(path) == digest, path
assert [row["n"] for row in candidate["lessons"]] == [4, 5, 6]
assert [row["lesson"] for row in modes["lessons"]] == [4, 5, 6]
assert [row["lesson"] for row in forms["lessons"]] == [4, 5, 6]
for lesson, mode, form in zip(candidate["lessons"], modes["lessons"], forms["lessons"]):
    n = lesson["n"]
    assert mode["stableLessonKey"] == form["stableLessonKey"] == f"french-basics:{n}"
    assert len(lesson["words"]) == 14 and len(lesson["reader"]) == 6
    assert len(form["prompts"]) >= 4 and form["reviewed"] is False
    assert all(lesson[key].strip() for key in ("title", "objective", "focus", "scene", "speaking"))
    assert all(card["fr"].strip() and card["en"].strip() for card in lesson["words"])
    assert all(line["fr"].strip() and line["en"].strip() for line in lesson["reader"])
    targets = {card["fr"] for card in lesson["words"]} | {line["fr"] for line in lesson["reader"]}
    targets |= set(form["grammarModel"].values())
    assert set(mode["modes"]) == set(NAMES)
    for name in NAMES:
        cue = mode["modes"][name]
        assert cue["prompt"].strip() and cue["targetText"].strip()
        assert cue.get("recordedAudio", False) is False
        assert cue["targetText"] in targets, (n, name, cue["targetText"])
    for prompt in form["prompts"]:
        assert prompt["reviewed"] is False and prompt["englishPrompt"].strip()
        assert prompt["frenchAnswer"].strip()
        if prompt["source"] == "aligned-reader":
            line = lesson["reader"][prompt["sourceReaderTurn"] - 1]
            assert line == {"fr": prompt["frenchAnswer"], "en": prompt["englishPrompt"]}
assert candidate["lessons"][0]["words"][2]["en"] == "is"
assert candidate["lessons"][1]["words"][4]["en"] == "is"
assert "de petites trousses" in candidate["lessons"][0]["objective"]
assert forms["lessons"][1]["prompts"][5]["englishPrompt"] == "My female friend is here."
assert forms["lessons"][2]["prompts"][4]["englishPrompt"] == "Do you (formal) have water?"
print("French 101 Core 4–6 owner source, IDs, alignment and closed gates: PASS")
