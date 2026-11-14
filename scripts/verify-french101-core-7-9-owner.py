#!/usr/bin/env python3
"""Verify the source-pinned, owner-only French 101 Core 7–9 projection."""
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


candidate = read("private-core-7-9-owner-candidate-fr-en.json")
modes = read("private-core-7-9-mode-prompts-fr-en.json")
forms = read("private-form-practice-core-7-9-fr-en.json")
assert candidate["target"] == "French" and candidate["native"] == "English"
assert candidate["reviewed"] is candidate["registered"] is False
assert candidate["sourceFile"] == modes["sourceFile"] == forms["sourceFile"]
assert candidate["sourceSha256"] == modes["sourceSha256"] == forms["sourceSha256"]
assert candidate["draftFile"] == "content/french-basics/core-7-9-draft.json"
assert candidate["draftSha256"] == "6849334969a6ad29bafa457bc5cecba35f008c07d26544bf01af6730a9e69efc"
assert candidate["englishSourceFile"] == "content/french-basics/source-english-core-7-9.json"
assert candidate["englishSourceSha256"] == "15aee39b0ef523d56b544326eec160dc134642dca625238cfeb7688f3aa622e9"
assert modes["pairKey"] == forms["pairKey"] == "French:English"
assert modes["registered"] is forms["registered"] is False
assert modes["reviewed"] is forms["reviewed"] is False
assert forms["courseId"] == "french-basics:fr-en"
for path, digest in candidate["sourceFileSha256"].items():
    assert sha(path) == digest, path
assert [row["n"] for row in candidate["lessons"]] == [7, 8, 9]
assert [row["lesson"] for row in modes["lessons"]] == [7, 8, 9]
assert [row["lesson"] for row in forms["lessons"]] == [7, 8, 9]
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
assert candidate["lessons"][0]["words"][2]["fr"] == "les"
assert forms["counts"] == {"lessons": 3, "alignedReaderPrompts": 18, "newAuthoredContrasts": 2, "totalPrompts": 20, "grammarModels": 3}
assert {p["frenchAnswer"] for p in forms["lessons"][0]["prompts"] if p["source"] == "authored-draft-contrast"} == {"Ils vont aux magasins.", "Vous allez à l’école."}
assert {p["sourceReaderTurn"] for p in forms["lessons"][0]["prompts"] if p["source"] == "aligned-reader"} == set(range(1, 7))
assert {p["sourceReaderTurn"] for p in forms["lessons"][1]["prompts"] if p["source"] == "aligned-reader"} == set(range(1, 7))
assert candidate["lessons"][1]["words"][1] == {"fr": "est", "en": "is", "kind": "term"}
assert candidate["lessons"][2]["reader"][4] == {"fr": "Pourquoi étudies-tu le français ?", "en": "Why do you study French?"}
print("French 101 Core 7–9 owner source, IDs, alignment and closed gates: PASS")
