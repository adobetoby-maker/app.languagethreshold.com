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
    ROOT / "content/french-travel-breakfast/core-1-3-draft.json",
    ROOT / "content/french-travel-breakfast/core-7-9-draft.json",
    ROOT / "content/french-travel-breakfast/core-22-24-draft.json",
    ROOT / "content/french-travel-breakfast/core-25-27-draft.json",
    ROOT / "content/french-travel-breakfast/core-28-30-draft.json",
    ROOT / "content/french-travel-breakfast/master-7-9-draft.json",
]
FIXTURE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
SOURCE_LOCALE = re.compile(
    r"\b(?:Oaxaca|Mexico|Mexique|Mexican|pesos?|Spanish|espagnol|Spain|Espagne|Madrid|"
    r"Roma|Rome|Italian|italien|Puebla|chilaquiles|salsa verde|Colombi\w*|Salento|"
    r"Nequi|arepas?|aguapanela\w*|calentado\w*|pan dulce|Doña|Don Ramón)\b", re.I
)
LOCALIZED = {f"foundation:{n}" for n in range(1, 11)} | {"core:3", "core:7", "core:22", "core:23", "core:24", "core:25", "core:28", "core:29", "master:7"}
REMAINING = []


def main():
    fixture = json.loads(FIXTURE.read_text())
    assert fixture["sourceLocaleCarryoverLessonKeys"] == REMAINING
    assert all(value is False for value in fixture["releaseGate"].values())
    assert (fixture["targetLanguage"], fixture["nativeLanguage"]) == ("French", "English")
    drafts = [json.loads(path.read_text()) for path in DRAFTS]
    for stage, source_lesson in (
        (draft["stage"], lesson) for draft in drafts for lesson in draft["lessons"]
        if f"{draft['stage']}:{lesson['n']}" in LOCALIZED
    ):
        n = source_lesson["n"]
        candidate = next(lesson for lesson in fixture["lessons"] if lesson["draftLessonKey"] == f"{stage}:{n}")
        assert candidate["reviewed"] is False and candidate["registered"] is False
        assert source_lesson["reviewed"] is False
        passage = source_lesson["passage"]
        learner_english = passage.get("englishFrenchCourse", passage["english"])
        assert len(learner_english) == len(passage["english"]) == len(passage["french"])
        assert [line["supportEnglish"] for line in candidate["reader"]] == learner_english
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
    bill = next(lesson for lesson in fixture["lessons"] if lesson["draftLessonKey"] == "foundation:9")
    assert "vingt euros" in bill["reader"][7]["targetFrench"]
    assert "dix-huit euros" in bill["reader"][7]["targetFrench"]
    assert "deux euros" in bill["reader"][8]["targetFrench"]
    emergency = next(lesson for lesson in fixture["lessons"] if lesson["draftLessonKey"] == "core:24")
    assert "rue des Tilleuls" in emergency["speaking"]["openingFrench"]
    assert "Rue des Tilleuls" in emergency["reader"][4]["supportEnglish"]
    assert "Juárez" not in json.dumps(emergency["reader"], ensure_ascii=False)
    burn = next(lesson for lesson in fixture["lessons"] if lesson["draftLessonKey"] == "core:25")
    assert burn["requiresQualifiedReview"] is True
    assert "Oaxaca" not in json.dumps(burn["reader"], ensure_ascii=False)
    assert "small burn" not in json.dumps(burn["reader"], ensure_ascii=False)
    tip = next(lesson for lesson in fixture["lessons"] if lesson["draftLessonKey"] == "core:29")
    assert "10 percent" not in json.dumps(tip["reader"], ensure_ascii=False)
    assert "dix pour cent" not in json.dumps(tip["reader"], ensure_ascii=False)
    group = next(lesson for lesson in fixture["lessons"] if lesson["draftLessonKey"] == "master:7")
    assert "Québec" in group["reader"][0]["targetFrench"]
    assert "Québec" in group["reader"][0]["supportEnglish"]
    assert group["reviewed"] is False and group["registered"] is False
    print("French Travel Breakfast localized pairs passed; zero identified source-locale carryovers")


if __name__ == "__main__":
    main()
