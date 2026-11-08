#!/usr/bin/env python3
"""Inventory exact, unsynthesized Japanese Breakfast draft speech text."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-travel-breakfast"
OUTPUT = CONTENT / "private-audio-scope-ja-en.json"
SOURCES = (
    ("foundation-1-10-draft.json", "foundation-travel-breakfast", 1, 10),
    ("core-1-30-draft.json", "travel-breakfast", 1, 30),
    ("master-1-3-draft.json", "master-travel-breakfast", 1, 3),
    ("master-4-6-draft.json", "master-travel-breakfast", 4, 6),
    ("master-7-9-draft.json", "master-travel-breakfast", 7, 9),
    ("master-10-12-draft.json", "master-travel-breakfast", 10, 12),
    ("master-13-15-draft.json", "master-travel-breakfast", 13, 15),
    ("master-16-18-draft.json", "master-travel-breakfast", 16, 18),
    ("master-19-20-draft.json", "master-travel-breakfast", 19, 20),
)
VOICES = ("ja-JP-Chirp3-HD-Aoede", "ja-JP-Chirp3-HD-Charon")


def build():
    source_hashes = {}
    occurrences = defaultdict(list)
    stage_lessons = defaultdict(list)
    placements = defaultdict(int)

    def add(text, lesson, field):
        assert isinstance(text, str) and text and text == text.strip()
        occurrences[text].append({"stableLessonId": lesson["stableId"], "field": field})
        placements[field.split("[")[0]] += 1

    for filename, stage_id, first, last in SOURCES:
        raw = (CONTENT / filename).read_bytes()
        source_hashes[filename] = hashlib.sha256(raw).hexdigest()
        data = json.loads(raw)
        assert (data["moduleId"], data["stageId"], data["target"], data["native"]) == (
            "travel-breakfast", stage_id, "Japanese", "English"
        )
        assert data["reviewed"] is False and data["registered"] is False
        assert data["audio"] == "none"
        assert [lesson["n"] for lesson in data["lessons"]] == list(range(first, last + 1))
        for lesson in data["lessons"]:
            assert lesson["stableId"] == f"{stage_id}:{lesson['n']}:ja-en"
            stage_lessons[stage_id].append(lesson["stableId"])
            for i, card in enumerate(lesson["cards"], 1):
                add(card["ja"], lesson, f"cards[{i}].ja")
            for i, line in enumerate(lesson["reader"], 1):
                add(line["ja"], lesson, f"reader[{i}].ja")
            add(lesson["speaking"]["opening"], lesson, "speaking.opening")
            for i, word in enumerate(lesson["speaking"]["wordBank"], 1):
                add(word, lesson, f"speaking.wordBank[{i}]")

    assert {k: len(v) for k, v in stage_lessons.items()} == {
        "foundation-travel-breakfast": 10, "travel-breakfast": 30, "master-travel-breakfast": 20
    }
    texts = sorted(occurrences)
    joined = "\n".join(texts).encode("utf-8")
    characters = sum(len(value) for value in texts)
    return {
        "schema": 1,
        "state": "private-audio-scope-draft",
        "moduleId": "travel-breakfast",
        "pairKey": "Japanese:English",
        "targetLanguage": "Japanese",
        "supportLanguage": "English",
        "reviewed": False,
        "registered": False,
        "locale": "ja-JP",
        "providerProposal": "Google Cloud Chirp 3 HD",
        "voicesProposed": list(VOICES),
        "sourceSha256": source_hashes,
        "includedFields": ["cards[].ja", "reader[].ja", "speaking.opening", "speaking.wordBank[]"],
        "excludedFields": ["English support", "mode instructions", "unwritten AI replies"],
        "stageLessons": dict(stage_lessons),
        "counts": {
            "lessons": sum(len(v) for v in stage_lessons.values()),
            "placementsByField": dict(sorted(placements.items())),
            "uniqueExactTexts": len(texts),
            "projectedClips": len(texts) * len(VOICES),
            "unicodeCharactersPerVoice": characters,
            "projectedUnicodeCharactersBothVoices": characters * len(VOICES),
        },
        "exactTextSha256": hashlib.sha256(joined).hexdigest(),
        "reviewGates": {
            "japaneseTextReviewed": False,
            "domainReviewed": False,
            "recordingsGenerated": False,
            "hashAndDurationChecked": False,
            "listeningReviewed": False,
            "playbackIntegrated": False,
            "registered": False,
        },
        "texts": [
            {"text": value, "sha256": hashlib.sha256(value.encode("utf-8")).hexdigest(),
             "occurrences": occurrences[value]}
            for value in texts
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    serialized = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == serialized, "Japanese Breakfast private audio scope is stale"
    else:
        OUTPUT.write_text(serialized)
    print("Japanese Breakfast private audio scope verified")


if __name__ == "__main__":
    main()
