#!/usr/bin/env python3
"""Validate source identity and exact English pairs for the French Roofing pilot."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"


def validate_batch(first: int, last: int):
    data = json.loads((CONTENT / f"foundation-{first}-{last}-draft.json").read_text())
    assert data["moduleId"] == "roofing"
    assert (data["target"], data["native"]) == ("French", "English")
    assert data["state"] == "translation-draft" and data["reviewed"] is False
    for name, expected in data["sourceFileSHA256"].items():
        actual = hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
        assert actual == expected, f"Source changed: {name}"
    source_bytes = (CONTENT / f"source-english-foundation-{first}-{last}.json").read_bytes()
    assert hashlib.sha256(source_bytes).hexdigest() == data["englishSourceSubsetSHA256"]
    source = json.loads(source_bytes)["lessons"]

    # The public source is independently parsed, so a draft cannot alter or omit reading pairs.
    public = json.loads((ROOT / "public/lesson-content/es/foundation-roofing.json").read_text())["lessons"]
    lessons = data["lessons"]
    assert [lesson["n"] for lesson in lessons] == list(range(first, last + 1))
    for lesson, original in zip(lessons, source):
        assert lesson["n"] == original["n"]
        if first >= 7:
            assert lesson["titleEnglish"] == original["titleEnglish"]
            assert lesson.get("objectiveEnglishSource", lesson["objectiveEnglish"]) == original["objectiveEnglishSource"]
        assert len(lesson["words"]) == 12
        assert [(word["en"], word["kind"]) for word in lesson["words"]] == [
            (word["en"], word["kind"]) for word in original["words"]
        ]
        assert all(word["en"].strip() and word["fr"].strip() for word in lesson["words"])
        assert all(word["kind"] in ("term", "phrase") for word in lesson["words"])
        source_reading = lesson["reading"].get("sourceNative", lesson["reading"]["native"])
        assert source_reading == original["readingEnglish"]
        assert source_reading == public[str(lesson["n"])]["passage"]["native"]
        assert len(lesson["reading"]["target"]) == len(lesson["reading"]["native"])
        assert all(line.strip() for line in lesson["reading"]["target"])
        assert lesson["speakingFrenchOpening"].strip()
        if first >= 7:
            assert lesson["speakingEnglish"] == original["speakingEnglishSource"]
        assert len(lesson["verbs"]) == len(original["verbEnglish"])
        if first >= 7:
            assert [(verb.get("meaningEnglishSource", verb["meaningEnglish"]), verb.get("exampleEnglishSource", verb["exampleEnglish"])) for verb in lesson["verbs"]] == [
                (verb["infinitiveEnglish"], verb["exampleEnglish"]) for verb in original["verbEnglish"]
            ]
    print(f"French Roofing F{first}–F{last}: source hashes, English pairs, readings and verb count pass")


def main():
    for first, last in [(1, 3), (4, 6), (7, 10)]:
        validate_batch(first, last)
    print("Human review remains false; these are unreleased translation drafts")


if __name__ == "__main__":
    main()
