#!/usr/bin/env python3
"""Validate pinned English anchors in the private French Breakfast Core 1–3 draft."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "content/french-travel-breakfast/core-1-3-draft.json"
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
PROGRESSION = ROOT / "src/data/travel-zone.ts"
META = [
    ("Enter a busy café", "greet staff, learn whether to order at the counter, and find a place", "Walk into a crowded Roman café and work out how ordering and seating operate."),
    ("Order local coffee", "ask about coffee styles, size, milk, temperature, and where to drink it", "Order a local coffee without assuming the names or customs are the same as at home."),
    ("Choose pastries and bread", "ask what is fresh, filled, sweet, savory, or typical", "Ask the server to explain three pastries and recommend one made that morning."),
]
# Core 3's proposed Francophone bakery scene replaces two Spanish-source bakery
# items. Keep the source meaning and verb identity pinned while checking the
# localized French/English example pairs explicitly.
LOCALIZED_VERB_EXAMPLES = {
    (3, "recomendar"): (
        "The employee recommends a bolillo with cheese.",
        "The employee recommends a baguette with cheese.",
        "L'employée recommande une baguette avec du fromage.",
    ),
    (3, "probar"): (
        "Today we try a concha.",
        "Today we try a brioche.",
        "Aujourd'hui, nous goûtons une brioche.",
    ),
}


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
    assert [item["n"] for item in draft["lessons"]] == [1, 2, 3]

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
            localized = LOCALIZED_VERB_EXAMPLES.get((number, source_verb["infinitive"]))
            if localized:
                source_example, english_example, french_example = localized
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

    print("French Travel Breakfast Core 1–3: source hashes and exact English pairs pass; review remains open")


if __name__ == "__main__":
    main()
