#!/usr/bin/env python3
"""Validate pinned English anchors in the private French Breakfast Core 22–24 draft."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "content/french-travel-breakfast/core-22-24-draft.json"
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
PROGRESSION = ROOT / "src/data/travel-zone.ts"
META = [
    ("Follow café etiquette", "learn local habits about milky coffee, sugar, lingering, and paying first", "Ask a barista which café habits mark someone as a tourist and how long it is fine to stay at a table."),
    ("Find an early-opening bakery", "ask a local for a specific recommendation, opening hours, and walking directions", "Ask the hotel host where to find the best bakery open before 7 a.m. and how to walk there."),
    ("Get help in a café emergency", "alert staff, ask someone to call emergency services, give the location, and describe what you saw", "A guest at the next table collapses; alert the staff, ask for emergency help, and describe what happened."),
]


def main() -> None:
    draft = json.loads(DRAFT.read_text())
    source = json.loads(SOURCE.read_text())["lessons"]
    progression = PROGRESSION.read_text()
    assert (draft["moduleId"], draft["targetLanguage"], draft["nativeLanguage"], draft["stage"]) == (
        "travel-breakfast", "French", "English", "core"
    )
    assert draft["state"] == "translation-draft" and draft["reviewed"] is False
    for path in (SOURCE, PROGRESSION):
        name = str(path.relative_to(ROOT))
        assert draft["sourceFilesSHA256"][name] == hashlib.sha256(path.read_bytes()).hexdigest()
    assert [item["n"] for item in draft["lessons"]] == [22, 23, 24]

    for item, (title, objective, scenario) in zip(draft["lessons"], META):
        number = item["n"]
        original = source[str(number)]
        assert item["reviewed"] is False
        assert (item["titleEnglish"], item["objectiveEnglish"], item["scenarioEnglishSource"]) == (
            title, objective, scenario
        )
        assert all(value in progression for value in (title, objective, scenario))
        assert [(word["en"], word["kind"]) for word in item["words"]] == [
            (word["en"], word["kind"]) for word in original["words"]
        ]
        assert item["passage"]["english"] == original["passage"]["native"]
        assert len(item["passage"]["french"]) == len(item["passage"]["english"])
        assert [(verb["meaningEnglish"], verb["exampleEnglish"], verb["sourceInfinitiveSpanish"])
                for verb in item["verbs"]] == [
            (verb["native"], verb["example"]["native"], verb["infinitive"])
            for verb in original["verbs"]
        ]
        assert all(word["fr"].strip() for word in item["words"])
        assert all(line.strip() for line in item["passage"]["french"])
        assert all(verb["infinitiveFrench"].strip() and verb["exampleFrench"].strip() for verb in item["verbs"])
        assert all(item[field].strip() for field in (
            "titleFrenchCourseEnglish", "objectiveFrenchCourseEnglish", "focusEnglish",
            "focusFrench", "teachingNotesEnglish", "speakingInstructionEnglish", "speakingFrench"
        ))
    print("French Travel Breakfast Core 22–24: source hashes and exact English pairs pass; review remains open")


if __name__ == "__main__":
    main()
