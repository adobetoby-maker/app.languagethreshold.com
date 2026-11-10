#!/usr/bin/env python3
"""Build a private, exact-pair dictionary candidate from FR-001 authored cards."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-pronunciation"
OUTPUT = SOURCE / "private-dictionary-candidate-fr-en.json"


def build():
    files = sorted(SOURCE.glob("*-draft.json"))
    assert len(files) == 21, "expected all 21 source batches"
    entries = defaultdict(lambda: defaultdict(list))
    sources = {}
    lesson_ids = set()
    placements = 0
    for path in files:
        raw = path.read_bytes()
        data = json.loads(raw)
        assert data["moduleId"] == "french-sound-like-a-native"
        assert (data["targetLanguage"], data["nativeLanguage"]) == ("French", "English")
        assert data["reviewed"] is False and data["runtimeRegistered"] is False
        sources[str(path.relative_to(ROOT))] = hashlib.sha256(raw).hexdigest()
        for lesson in data["lessons"]:
            lesson_id = lesson["id"]
            assert lesson_id.endswith(":fr-en") and lesson_id not in lesson_ids
            lesson_ids.add(lesson_id)
            assert len(lesson["words"]) == 10
            for number, word in enumerate(lesson["words"], 1):
                french, english = word["fr"], word["en"]
                assert french and english and word["kind"] in ("term", "phrase")
                entries[french][english].append({
                    "lessonId": lesson_id,
                    "card": number,
                    "kind": word["kind"],
                })
                placements += 1
    assert len(lesson_ids) == 60 and placements == 600
    records = []
    for french, glosses in sorted(entries.items()):
        records.append({
            "exactFrenchText": french,
            "senses": [
                {"englishGlossFromSource": english, "occurrences": occurrences}
                for english, occurrences in sorted(glosses.items())
            ],
            "multipleSourceGlosses": len(glosses) > 1,
            "qualifiedFrenchReviewRequired": True,
        })
    return {
        "schema": 1,
        "moduleId": "french-sound-like-a-native",
        "pairKey": "French:English",
        "state": "private-provisional-unreviewed-unregistered",
        "sourceFiles": sources,
        "lessonCount": len(lesson_ids),
        "cardPlacements": placements,
        "exactFrenchEntries": len(records),
        "entriesWithMultipleSourceGlosses": sum(x["multipleSourceGlosses"] for x in records),
        "runtimeRegistered": False,
        "entries": records,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    report = build()
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.write:
        OUTPUT.write_text(encoded)
    if args.check:
        assert OUTPUT.read_text() == encoded, "private pronunciation dictionary is stale"
    print(json.dumps({key: report[key] for key in (
        "lessonCount", "cardPlacements", "exactFrenchEntries", "entriesWithMultipleSourceGlosses"
    )}))


if __name__ == "__main__":
    main()
