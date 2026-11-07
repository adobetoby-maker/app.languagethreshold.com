#!/usr/bin/env python3
"""Check source-pinned English anchors in private French Travel Breakfast Master 4–6."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "content/french-travel-breakfast/master-4-6-draft.json"
STAGE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"


def main() -> None:
    draft = json.loads(DRAFT.read_text())
    stage = json.loads(STAGE.read_text())["lessons"]
    reader = json.loads(READER.read_text())["lessons"]
    assert (draft["moduleId"], draft["targetLanguage"], draft["nativeLanguage"], draft["stage"]) == (
        "travel-breakfast", "French", "English", "master"
    )
    assert draft["state"] == "translation-draft" and draft["reviewed"] is False
    for path in (STAGE, READER):
        key = str(path.relative_to(ROOT))
        assert draft["sourceFilesSHA256"][key] == hashlib.sha256(path.read_bytes()).hexdigest()
    assert [x["n"] for x in draft["lessons"]] == [4, 5, 6]
    for item in draft["lessons"]:
        n = item["n"]
        original = stage[n - 1]
        content = reader[str(n)]
        assert item["reviewed"] is False
        assert (item["titleEnglish"], item["objectiveEnglish"], item["sourceSpeakingEnglish"], item["sourceGrammarFocusEnglish"]) == (
            original["title"], original["objective"], original["speaking"], original["grammar"]["focus"]
        )
        assert [(x["en"], x["kind"]) for x in item["words"]] == [
            (x["en"], x["kind"]) for x in original["words"]
        ]
        assert item["passage"]["english"] == content["passage"]["native"]
        assert len(item["passage"]["french"]) == len(item["passage"]["english"])
        assert [(x["meaningEnglish"], x["exampleEnglish"], x["sourceInfinitiveSpanish"])
                for x in item["verbs"]] == [
            (x["native"], x["example"]["native"], x["infinitive"])
            for x in content["verbs"]
        ]
        assert [x["english"] for x in item["grammarExamples"]] == [
            x["en"] for x in original["grammar"]["examples"]
        ]
        assert all(x["fr"].strip() for x in item["words"])
        assert all(x.strip() for x in item["passage"]["french"])
        assert all(x["infinitiveFrench"].strip() and x["exampleFrench"].strip() for x in item["verbs"])
        assert all(x["french"].strip() for x in item["grammarExamples"])
        assert all(item[field].strip() for field in (
            "titleFrenchCourseEnglish", "objectiveFrenchCourseEnglish", "focusEnglish",
            "focusFrench", "teachingNotesEnglish", "speakingInstructionEnglish", "speakingFrench"
        ))
    # A source-pair regression gate for the allergy and dietary claims corrected here.
    fourth, _, sixth = draft["lessons"]
    assert "what you can eat" not in json.dumps(fourth).lower()
    assert "what you can eat" not in json.dumps(stage[3]).lower()
    assert "what you can eat" not in json.dumps(reader["4"]).lower()
    assert "ingredients and preparation" in fourth["words"][next(
        i for i, word in enumerate(fourth["words"]) if word["en"].startswith("After reading the label")
    )]["en"]
    assert "cross-contact" in reader["4"]["passage"]["native"][15]
    assert "another meal or skip the buffet" in reader["4"]["passage"]["native"][15]
    assert "before she chooses" in json.dumps(sixth)
    assert "before she chooses" in json.dumps(stage[5])
    assert "cannot confirm" in reader["6"]["passage"]["native"][13]
    assert "another option" in reader["6"]["passage"]["native"][17]
    print("French Travel Breakfast Master 4–6: source hashes and exact English pairs pass; review remains open")


if __name__ == "__main__":
    main()
