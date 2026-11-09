#!/usr/bin/env python3
"""Pin unsynthesized French Travel Breakfast card/Reader speech without releasing audio."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-audio-scope-fr-en.json"


def sha(value):
    return hashlib.sha256(value).hexdigest()


def build():
    raw = FIXTURE.read_bytes()
    fixture = json.loads(raw)
    assert (fixture["moduleId"], fixture["targetLanguage"], fixture["nativeLanguage"]) == (
        "travel-breakfast", "French", "English"
    )
    assert fixture["stageCounts"] == {"foundation": 10, "core": 30, "master": 20}
    assert fixture["lessonCount"] == len(fixture["lessons"]) == 60
    assert not any(fixture["releaseGate"].values())
    occurrences = defaultdict(list)
    placements = defaultdict(int)
    stage_lessons = defaultdict(list)

    def add(text, lesson, field):
        assert isinstance(text, str) and text and text == text.strip()
        occurrences[text].append({"draftLessonKey": lesson["draftLessonKey"], "field": field})
        placements[field.split("[")[0]] += 1

    for lesson in fixture["lessons"]:
        assert lesson["reviewed"] is False and lesson["registered"] is False
        assert lesson["draftLessonKey"] == f"{lesson['stage']}:{lesson['n']}"
        stage_lessons[lesson["stage"]].append(lesson["draftLessonKey"])
        for index, word in enumerate(lesson["words"], 1):
            assert word["supportEnglish"].strip()
            add(word["targetFrench"], lesson, f"cards[{index}].targetFrench")
        for index, line in enumerate(lesson["reader"], 1):
            assert line["supportEnglish"].strip()
            add(line["targetFrench"], lesson, f"reader[{index}].targetFrench")

    assert {stage: len(ids) for stage, ids in stage_lessons.items()} == fixture["stageCounts"]
    texts = sorted(occurrences)
    return {
        "schema": 1,
        "state": "private-audio-scope-draft",
        "moduleId": "travel-breakfast",
        "pairKey": "French:English",
        "locale": "fr-FR",
        "sourceFixtureSha256": sha(raw),
        "reviewed": False,
        "registered": False,
        "recordingsGenerated": False,
        "listeningReviewed": False,
        "includedFields": ["cards[].targetFrench", "reader[].targetFrench"],
        "excludedFields": ["English support", "mode instructions", "interactive speaking openings", "unwritten AI replies"],
        "speakingOpeningsDeferred": 60,
        "stageLessons": dict(stage_lessons),
        "counts": {
            "lessons": 60,
            "placementsByField": dict(sorted(placements.items())),
            "uniqueExactTexts": len(texts),
            "unicodeCharactersPerVoice": sum(len(text) for text in texts),
        },
        "exactTextSha256": sha("\n".join(texts).encode("utf-8")),
        "texts": [
            {"text": text, "sha256": sha(text.encode("utf-8")), "occurrences": occurrences[text]}
            for text in texts
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == encoded, "French Travel Breakfast private audio scope is stale"
    else:
        OUTPUT.write_text(encoded)
    print("French Travel Breakfast private audio scope verified")


if __name__ == "__main__":
    main()
