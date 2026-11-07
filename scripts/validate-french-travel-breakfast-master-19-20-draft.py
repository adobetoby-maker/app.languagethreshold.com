#!/usr/bin/env python3
"""Verify source provenance and bilingual alignment of private Master 19–20 drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "content/french-travel-breakfast/master-19-20-draft.json"
STAGE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"


def main() -> None:
    draft = json.loads(DRAFT.read_text())
    stages = json.loads(STAGE.read_text())["lessons"]
    readings = json.loads(READER.read_text())["lessons"]
    assert (draft["moduleId"], draft["targetLanguage"], draft["nativeLanguage"], draft["stage"]) == (
        "travel-breakfast", "French", "English", "master"
    )
    assert draft["state"] == "localized-content-draft" and draft["reviewed"] is False
    for path in (STAGE, READER):
        key = str(path.relative_to(ROOT))
        assert draft["sourceFilesSHA256"][key] == hashlib.sha256(path.read_bytes()).hexdigest(), key
    assert [item["n"] for item in draft["lessons"]] == [19, 20]
    for item in draft["lessons"]:
        n = item["n"]
        stage = stages[n - 1]
        reading = readings[str(n)]
        assert item["reviewed"] is False
        assert (item["sourceTitleEnglish"], item["sourceObjectiveEnglish"],
                item["sourceSpeakingEnglish"], item["sourceGrammarFocusEnglish"]) == (
                    stage["title"], stage["objective"], stage["speaking"], stage["grammar"]["focus"]
                )
        assert item["sourceWordsEnglish"] == [
            {"en": word["en"], "kind": word["kind"]} for word in stage["words"]
        ]
        assert item["sourcePassageEnglish"] == reading["passage"]["native"]
        assert item["sourceVerbsEnglish"] == [
            {"meaningEnglish": verb["native"], "exampleEnglish": verb["example"]["native"],
             "sourceInfinitiveSpanish": verb["infinitive"]} for verb in reading["verbs"]
        ]
        assert item["sourceGrammarExamplesEnglish"] == [example["en"] for example in stage["grammar"]["examples"]]
        assert len(item["words"]) == len(stage["words"])
        assert len(item["passage"]["english"]) == len(item["passage"]["french"]) == len(reading["passage"]["native"])
        assert len(item["verbs"]) == len(reading["verbs"])
        assert len(item["grammarExamples"]) == len(stage["grammar"]["examples"])
        assert all(word["en"].strip() and word["fr"].strip() and word["kind"] in {"term", "phrase"}
                   for word in item["words"])
        assert all(en.strip() and fr.strip() for en, fr in zip(item["passage"]["english"], item["passage"]["french"]))
        assert all(verb["infinitiveFrench"].strip() and verb["meaningEnglish"].strip() and
                   verb["exampleEnglish"].strip() and verb["exampleFrench"].strip() for verb in item["verbs"])
        assert all(example["english"].strip() and example["french"].strip() for example in item["grammarExamples"])
        assert all(item[key].strip() for key in (
            "titleFrenchCourseEnglish", "objectiveFrenchCourseEnglish", "settingEnglish", "focusEnglish",
            "focusFrench", "teachingNotesEnglish", "speakingInstructionEnglish", "speakingFrench"
        ))
    nineteenth, twentieth = draft["lessons"]
    checkout = " ".join(nineteenth["passage"]["english"]).lower()
    assert "does not describe any buffet item as safe" in checkout
    assert "without treating the future booking as settled" in checkout
    capstone = " ".join(twentieth["passage"]["english"]).lower()
    assert "cannot confirm" in capstone and "will not order café food" in capstone
    assert "alternative breakfast" in capstone
    print("French Travel Breakfast Master 19–20: exact source provenance and original bilingual pairs pass; review remains open")


if __name__ == "__main__":
    main()
