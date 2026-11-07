#!/usr/bin/env python3
"""Audit the complete private French Travel Breakfast Master draft sequence."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-travel-breakfast"
STAGE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
RANGES = ("1-3", "4-6", "7-9", "10-12", "13-15", "16-18", "19-20")


def main() -> None:
    stage = json.loads(STAGE.read_text())["lessons"]
    reader = json.loads(READER.read_text())["lessons"]
    expected_hashes = {
        str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in (STAGE, READER)
    }
    lessons = []
    schemas = []
    for batch in RANGES:
        draft = json.loads((CONTENT / f"master-{batch}-draft.json").read_text())
        assert (draft["moduleId"], draft["targetLanguage"], draft["nativeLanguage"], draft["stage"]) == (
            "travel-breakfast", "French", "English", "master"
        )
        assert draft["reviewed"] is False
        assert draft["sourceFilesSHA256"] == expected_hashes
        assert draft["state"] in {"translation-draft", "localized-content-draft"}
        schemas.extend([draft["schema"]] * len(draft["lessons"]))
        lessons.extend(draft["lessons"])
    assert [lesson["n"] for lesson in lessons] == list(range(1, 21))
    assert schemas == [2] * 20
    for lesson, schema in zip(lessons, schemas):
        n = lesson["n"]
        source = stage[n - 1]
        reading = reader[str(n)]
        assert lesson["reviewed"] is False
        assert lesson["sourceSpeakingEnglish"] == source["speaking"]
        assert lesson["sourceGrammarFocusEnglish"] == source["grammar"]["focus"]
        if schema == 1:
            assert lesson["titleEnglish"] == source["title"]
            assert lesson["objectiveEnglish"] == source["objective"]
            assert [(word["en"], word["kind"]) for word in lesson["words"]] == [
                (word["en"], word["kind"]) for word in source["words"]
            ]
            assert lesson["passage"]["english"] == reading["passage"]["native"]
        else:
            assert lesson["sourceTitleEnglish"] == source["title"]
            assert lesson["sourceObjectiveEnglish"] == source["objective"]
            assert lesson["sourceWordsEnglish"] == [
                {"en": word["en"], "kind": word["kind"]} for word in source["words"]
            ]
            assert lesson["sourcePassageEnglish"] == reading["passage"]["native"]
            assert len(lesson["words"]) == len(source["words"])
            assert len(lesson["passage"]["english"]) == len(reading["passage"]["native"])
        assert len(lesson["passage"]["english"]) == len(lesson["passage"]["french"])
        assert len(lesson["verbs"]) == len(reading["verbs"])
        assert len(lesson["grammarExamples"]) == len(source["grammar"]["examples"])
        assert lesson["speakingFrench"].strip()
    print(
        "French Travel Breakfast private Master draft: 20/20 contiguous; "
        f"{sum(len(lesson['words']) for lesson in lessons)} bilingual cards; "
        f"{sum(len(lesson['passage']['english']) for lesson in lessons)} aligned Reader lines; "
        "20 original Francophone drafts; reviewed:false"
    )


if __name__ == "__main__":
    main()
