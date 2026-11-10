#!/usr/bin/env python3
"""Build a private source-context queue for ambiguous Breakfast dictionary pairs."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-travel-breakfast"
DICTIONARY = CONTENT / "private-dictionary-draft-ja-en.json"
OUTPUT = CONTENT / "private-dictionary-context-review-ja-en.json"


def build():
    raw = DICTIONARY.read_bytes()
    dictionary = json.loads(raw)
    assert dictionary["reviewed"] is False and dictionary["registered"] is False
    lessons = {}
    for filename, expected_hash in dictionary["sourceSha256"].items():
        source = (CONTENT / filename).read_bytes()
        assert hashlib.sha256(source).hexdigest() == expected_hash, filename
        for lesson in json.loads(source)["lessons"]:
            assert lesson["stableId"] not in lessons
            lessons[lesson["stableId"]] = lesson

    ambiguous = []
    for headword in dictionary["ambiguousHeadwords"]:
        variants = []
        for entry in dictionary["entries"]:
            if entry["target"] != headword:
                continue
            occurrences = []
            for occurrence in entry["occurrences"]:
                lesson = lessons[occurrence["stableLessonId"]]
                card = lesson["cards"][occurrence["cardPosition"] - 1]
                assert (card["ja"], card["en"]) == (headword, entry["native"])
                reader_lines = [
                    {"ja": line["ja"], "en": line["en"]}
                    for line in lesson["reader"] if headword in line["ja"]
                ]
                occurrences.append({
                    "stableLessonId": lesson["stableId"],
                    "sourceFile": occurrence["sourceFile"],
                    "cardPosition": occurrence["cardPosition"],
                    "lessonTitle": lesson["title"],
                    "objective": lesson["objective"],
                    "scene": lesson["scene"],
                    "readerMatches": reader_lines,
                })
            variants.append({
                "exactPairId": entry["id"],
                "native": entry["native"],
                "kindVariants": entry["kindVariants"],
                "occurrences": occurrences,
            })
        assert len(variants) > 1, headword
        ambiguous.append({"headword": headword, "variants": variants})

    return {
        "schema": 1,
        "state": "private-context-review-queue",
        "pairKey": "Japanese:English",
        "reviewed": False,
        "registered": False,
        "sourceDictionarySha256": hashlib.sha256(raw).hexdigest(),
        "counts": {
            "ambiguousHeadwords": len(ambiguous),
            "exactPairVariants": sum(len(row["variants"]) for row in ambiguous),
            "cardOccurrences": sum(len(variant["occurrences"]) for row in ambiguous for variant in row["variants"]),
            "readerMatches": sum(len(occurrence["readerMatches"]) for row in ambiguous for variant in row["variants"] for occurrence in variant["occurrences"]),
        },
        "ambiguous": ambiguous,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    serialized = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == serialized, "Private dictionary context queue is stale"
    else:
        OUTPUT.write_text(serialized)
    print("Japanese Breakfast private dictionary contexts verified")


if __name__ == "__main__":
    main()
