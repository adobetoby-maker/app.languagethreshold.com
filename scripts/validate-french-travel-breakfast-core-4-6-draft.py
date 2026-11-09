#!/usr/bin/env python3
"""Validate pinned English anchors in the private French Breakfast Core 4–6 draft."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "content/french-travel-breakfast/core-4-6-draft.json"
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
PROGRESSION = ROOT / "src/data/travel-zone.ts"
META = [
    ("Order eggs and a full breakfast", "request eggs, sides, toast, fruit, and cooking preferences", "Build a complete hot breakfast order and confirm what is included."),
    ("Use hotel breakfast", "ask whether breakfast is included, the hours, room number, and buffet rules", "Arrive at a hotel breakfast and resolve uncertainty about access and seating."),
    ("Explain a breakfast restriction", "state an allergy or dietary need and confirm ingredients without seeking medical advice", "Ask whether a breakfast item contains nuts, dairy, gluten, meat, or another ingredient."),
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
    assert [item["n"] for item in draft["lessons"]] == [4, 5, 6]

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
        if number == 6:
            learner_english = item["passage"]["englishFrenchCourse"]
            assert learner_english[:-1] == item["passage"]["english"][:-1]
            assert learner_english[-1] == "I repeat the ingredients I avoid, and the server checks my order."
            assert item["passage"]["french"][-1] == (
                "Je répète les ingrédients que j'évite, et le serveur vérifie ma commande."
            )
            assert len(learner_english) == len(item["passage"]["french"])
            assert "medical advice" not in item["teachingNotesEnglish"].lower()
            assert "medical advice" not in " ".join(learner_english).lower()
            assert "conseil médical" not in " ".join(item["passage"]["french"]).lower()
            assert all("cross-contact" not in word.get("noteEnglish", "").lower()
                       for word in item["words"])
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

    print("French Travel Breakfast Core 4–6: source hashes and exact English pairs pass; review remains open")


if __name__ == "__main__":
    main()
