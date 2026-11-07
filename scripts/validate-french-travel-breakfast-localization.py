#!/usr/bin/env python3
"""Check the first bounded Francophone scene edits and remaining carryover."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "content/french-travel-breakfast/foundation-1-3-draft.json"
FIXTURE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
SOURCE_LOCALE = re.compile(r"\b(?:Oaxaca|Mexico|pesos?|Spanish|espagnol)\b", re.I)
REMAINING = [
    "foundation:4", "foundation:6", "foundation:8", "foundation:9",
    "foundation:10", "core:25", "core:29",
]


def main():
    draft = json.loads(DRAFT.read_text())
    fixture = json.loads(FIXTURE.read_text())
    assert fixture["sourceLocaleCarryoverLessonKeys"] == REMAINING
    assert all(value is False for value in fixture["releaseGate"].values())
    assert (fixture["targetLanguage"], fixture["nativeLanguage"]) == ("French", "English")
    for source_lesson in draft["lessons"]:
        n = source_lesson["n"]
        candidate = next(lesson for lesson in fixture["lessons"] if lesson["draftLessonKey"] == f"foundation:{n}")
        assert candidate["reviewed"] is False and candidate["registered"] is False
        assert source_lesson["reviewed"] is False
        passage = source_lesson["passage"]
        assert len(passage["englishFrenchCourse"]) == len(passage["english"]) == len(passage["french"])
        assert [line["supportEnglish"] for line in candidate["reader"]] == passage["englishFrenchCourse"]
        assert [line["targetFrench"] for line in candidate["reader"]] == passage["french"]
        learner_fields = {
            "title": candidate["titleEnglish"],
            "objective": candidate["objectiveEnglish"],
            "words": [
                {"fr": word["targetFrench"], "en": word["supportEnglish"], "note": original.get("noteEnglish")}
                for word, original in zip(candidate["words"], source_lesson["words"])
            ],
            "reader": candidate["reader"],
            "speaking": candidate["speaking"],
            "teachingNotesEnglish": source_lesson.get("teachingNotesEnglish", []),
        }
        assert SOURCE_LOCALE.search(json.dumps(learner_fields, ensure_ascii=False)) is None
        assert all(word["sourceEnglish"] == original["en"] for word, original in zip(candidate["words"], source_lesson["words"]))
    prices = next(lesson for lesson in fixture["lessons"] if lesson["draftLessonKey"] == "foundation:2")
    assert "douze euros" in prices["speaking"]["openingFrench"]
    assert "twelve euros" in prices["reader"][7]["supportEnglish"]
    print("French Travel Breakfast Foundation 1–3 localized pairs and remaining carryover passed")


if __name__ == "__main__":
    main()
