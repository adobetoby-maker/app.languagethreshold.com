#!/usr/bin/env python3
"""Validate the incomplete Japanese→English Foreman source without claiming release."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "content" / "japanese-construction-foreman"
SPEAKER_JAPANESE_NAMES = {
    "Sato": "さとう",
    "Tanaka": "たなか",
    "Yamada": "やまだ",
    "Kobayashi": "こばやし",
    "Ito": "いとう",
}


def read(name: str):
    return json.loads((SOURCE / name).read_text(encoding="utf-8"))


def pair(value: str):
    parts = value.split("|")
    assert len(parts) == 2 and all(part.strip() for part in parts), value


def main():
    course_map = read("course-map.json")
    foundation = read("foundation-draft.json")
    for source in (course_map, foundation):
        assert source["target"] == "Japanese"
        assert source["native"] == "English"
        assert source["reviewed"] is False
    assert course_map["moduleId"] == "construction-foreman"
    assert [len(course_map[stage]) for stage in ("foundation", "core", "master")] == [10, 30, 20]
    lessons = foundation["lessons"]
    assert 1 <= len(lessons) <= 10
    assert [lesson["n"] for lesson in lessons] == list(range(1, len(lessons) + 1))
    for lesson in lessons:
        assert lesson["title"] and lesson["focus"] and lesson["scene"]
        assert 8 <= len(lesson["terms"]) <= 16
        assert len(lesson["dialogue"]) >= 6
        assert len(lesson["speakers"]) == len(lesson["dialogue"])
        assert all(speaker.strip() for speaker in lesson["speakers"])
        for value in lesson["terms"] + lesson["dialogue"]:
            pair(value)
        for speaker, value in zip(lesson["speakers"], lesson["dialogue"]):
            japanese = value.split("|", 1)[0]
            own_name = SPEAKER_JAPANESE_NAMES.get(speaker)
            if own_name:
                assert f"{own_name}さん" not in japanese, (
                    f"Lesson {lesson['n']}: {speaker} uses さん for own name: {value}"
                )
    print(f"Japanese→English Foreman draft: {len(lessons)}/10 Foundation lessons valid; 30 Core and 20 Master mapped only")


if __name__ == "__main__":
    main()
