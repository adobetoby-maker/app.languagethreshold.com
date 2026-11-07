#!/usr/bin/env python3
"""Check immutable English anchors and source identity for the French pilot draft."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFTS = (
    (ROOT / "content/french-travel-breakfast/foundation-1-3-draft.json", [1, 2, 3]),
    (ROOT / "content/french-travel-breakfast/foundation-4-6-draft.json", [4, 5, 6]),
    (ROOT / "content/french-travel-breakfast/foundation-7-10-draft.json", [7, 8, 9, 10]),
)
SOURCE = ROOT / "src/data/core60/es/foundation-travel-breakfast.json"
PASSAGES = ROOT / "public/lesson-content/es/foundation-travel-breakfast.json"


def main() -> None:
    source = json.loads(SOURCE.read_text())
    passages = json.loads(PASSAGES.read_text())
    for draft_path, numbers in DRAFTS:
        validate_draft(draft_path, numbers, source, passages)
    print("French Travel Breakfast Foundation 1–10 source hashes and exact English pairs passed")


def validate_draft(draft_path: Path, numbers: list[int], source: dict, passages: dict) -> None:
    draft = json.loads(draft_path.read_text())
    assert draft["moduleId"] == "travel-breakfast"
    assert (draft["targetLanguage"], draft["nativeLanguage"]) == ("French", "English")
    assert draft["stage"] == "foundation" and draft["state"] == "translation-draft"
    assert draft["reviewed"] is False
    for path in (SOURCE, PASSAGES):
        name = str(path.relative_to(ROOT))
        assert draft["sourceFilesSHA256"][name] == hashlib.sha256(path.read_bytes()).hexdigest()

    assert [lesson["n"] for lesson in draft["lessons"]] == numbers
    for item in draft["lessons"]:
        n = item["n"]
        original = source["lessons"][n - 1]
        original_passage = passages["lessons"][str(n)]["passage"]
        assert item["titleEnglish"] == original["title"]
        assert item["objectiveEnglish"] == original["objective"]
        assert item["reviewed"] is False
        assert item["titleFrenchCourseEnglish"] and item["objectiveFrenchCourseEnglish"]
        assert item["focusEnglish"] and item["focusFrench"]
        assert item["speakingInstructionEnglish"] and item["speakingFrench"]
        assert [(word["en"], word["kind"]) for word in item["words"]] == [
            (word["en"], word["kind"]) for word in original["words"]
        ]
        assert all(word["fr"].strip() for word in item["words"])
        assert item["passage"]["english"] == original_passage["native"]
        assert len(item["passage"]["french"]) == len(item["passage"]["english"])
        assert all(line.strip() for line in item["passage"]["french"])

    if numbers == [1, 2, 3]:
        assert "pan dulce" not in " ".join(
            [word["fr"] for lesson in draft["lessons"] for word in lesson["words"]]
            + [line for lesson in draft["lessons"] for line in lesson["passage"]["french"]]
        )
        assert draft["lessons"][2]["titleFrenchCourseEnglish"] != "Ser and Estar"
    if numbers == [7, 8, 9, 10]:
        lesson_10 = draft["lessons"][-1]
        french_question = next(
            word for word in lesson_10["words"]
            if word["en"] == "How do you say this in Spanish?"
        )
        assert french_question["enFrenchCourse"] == "How do you say this in French?"
        assert "en français" in french_question["fr"]
        assert all(lesson["reviewed"] is False for lesson in draft["lessons"])


if __name__ == "__main__":
    main()
