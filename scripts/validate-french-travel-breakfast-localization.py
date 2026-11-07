#!/usr/bin/env python3
"""Check the first bounded Francophone scene edits and remaining carryover."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DRAFTS = [
    ROOT / "content/french-travel-breakfast/foundation-1-3-draft.json",
    ROOT / "content/french-travel-breakfast/foundation-4-6-draft.json",
    ROOT / "content/french-travel-breakfast/foundation-7-10-draft.json",
]
FIXTURE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
SOURCE_LOCALE = re.compile(
    r"\b(?:Oaxaca|Mexico|Mexique|Mexican|pesos?|Spanish|espagnol|Spain|Espagne|Madrid|"
    r"Roma|Rome|Italian|italien|Puebla|chilaquiles|salsa verde)\b", re.I
)
LOCALIZED = {1, 2, 3, 4, 6, 8}
REMAINING = [
    "foundation:5", "foundation:7", "foundation:9", "foundation:10",
    "core:3", "core:7", "core:22", "core:23", "core:24", "core:25",
    "core:28", "core:29", "master:7",
]


def main():
    fixture = json.loads(FIXTURE.read_text())
    assert fixture["sourceLocaleCarryoverLessonKeys"] == REMAINING
    assert all(value is False for value in fixture["releaseGate"].values())
    assert (fixture["targetLanguage"], fixture["nativeLanguage"]) == ("French", "English")
    drafts = [json.loads(path.read_text()) for path in DRAFTS]
    for source_lesson in (lesson for draft in drafts for lesson in draft["lessons"] if lesson["n"] in LOCALIZED):
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
    print("French Travel Breakfast six localized Foundation pairs and remaining carryover passed")


if __name__ == "__main__":
    main()
