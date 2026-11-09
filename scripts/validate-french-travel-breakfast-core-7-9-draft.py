#!/usr/bin/env python3
"""Validate pinned English anchors in the private French Breakfast Core 7–9 draft."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "content/french-travel-breakfast/core-7-9-draft.json"
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
PROGRESSION = ROOT / "src/data/travel-zone.ts"
META = [
    ("Ask what locals eat", "ask for a typical regional breakfast and understand a cultural explanation", "Tell the server you want the breakfast locals actually choose, not a tourist substitute."),
    ("Order for another person", "order several drinks and foods accurately and confirm who gets each item", "Order breakfast for a family or group with different preferences."),
    ("Request takeaway", "ask for food or coffee to go, packaging, napkins, and utensils", "Convert part of a seated order into takeaway because your train leaves soon."),
]
LOCALIZED_CORE_7_ORDER_EXAMPLE = (
    "The locals order chilaquiles in the morning.",
    "In this café, guests order tartines in the morning.",
    "Dans ce café, des clients commandent des tartines le matin.",
)


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
    assert [item["n"] for item in draft["lessons"]] == [7, 8, 9]

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
        assert len(item["verbs"]) == len(original["verbs"])
        for verb, source_verb in zip(item["verbs"], original["verbs"]):
            assert (verb["meaningEnglish"], verb["sourceInfinitiveSpanish"]) == (
                source_verb["native"], source_verb["infinitive"]
            )
            if number == 7 and source_verb["infinitive"] == "pedir":
                source_example, english_example, french_example = LOCALIZED_CORE_7_ORDER_EXAMPLE
                assert source_verb["example"]["native"] == source_example
                assert (verb["exampleEnglish"], verb["exampleFrench"]) == (
                    english_example, french_example
                )
            else:
                assert verb["exampleEnglish"] == source_verb["example"]["native"]
        assert all(word["fr"].strip() for word in item["words"])
        assert all(line.strip() for line in item["passage"]["french"])
        assert all(verb["infinitiveFrench"].strip() and verb["exampleFrench"].strip() for verb in item["verbs"])
        assert all(item[field].strip() for field in (
            "titleFrenchCourseEnglish", "objectiveFrenchCourseEnglish", "focusEnglish",
            "focusFrench", "teachingNotesEnglish", "speakingInstructionEnglish", "speakingFrench"
        ))

    print("French Travel Breakfast Core 7–9: source hashes and exact English pairs pass; review remains open")


if __name__ == "__main__":
    main()
