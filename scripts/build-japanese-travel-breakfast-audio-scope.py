#!/usr/bin/env python3
"""Pin exact Japanese Breakfast draft card/Reader text before paid synthesis."""
import argparse
import hashlib
import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-travel-breakfast"
OUTPUT = CONTENT / "private-audio-scope-ja-en.json"
SOURCES = [
    "foundation-1-10-draft.json",
    "core-1-30-draft.json",
    "master-1-3-draft.json",
    "master-4-6-draft.json",
    "master-7-9-draft.json",
    "master-10-12-draft.json",
    "master-13-15-draft.json",
    "master-16-18-draft.json",
    "master-19-20-draft.json",
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build():
    texts = {}
    hashes = {}
    lessons_seen = set()
    placements = {"cards": 0, "reader": 0}
    for name in SOURCES:
        path = CONTENT / name
        raw = path.read_bytes()
        hashes[name] = sha(raw)
        source = json.loads(raw)
        assert source["target"] == "Japanese" and source["native"] == "English"
        assert source["reviewed"] is False and source["registered"] is False
        for lesson in source["lessons"]:
            lesson_id = lesson["stableId"]
            assert lesson_id.endswith(":ja-en") and lesson_id not in lessons_seen
            lessons_seen.add(lesson_id)
            for field in ("cards", "reader"):
                for index, item in enumerate(lesson[field]):
                    text = item["ja"]
                    assert text == unicodedata.normalize("NFC", text) and text.strip() == text
                    assert text and item["en"].strip()
                    placements[field] += 1
                    texts.setdefault(text, []).append({"lessonId": lesson_id, "field": f"{field}[{index}].ja"})
    assert len(lessons_seen) == 60
    rows = [{"text": text, "sha256": sha(text.encode("utf-8")), "occurrences": texts[text]}
            for text in sorted(texts)]
    count = sum(len(row["text"]) for row in rows)
    result = {
        "schema": 1,
        "state": "private-audio-scope-draft",
        "moduleId": "travel-breakfast",
        "pairKey": "Japanese:English",
        "locale": "ja-JP",
        "voices": {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"},
        "sourceSha256": hashes,
        "reviewed": False,
        "registered": False,
        "recordingsGenerated": False,
        "listeningReviewed": False,
        "includedFields": ["cards[].ja", "reader[].ja"],
        "excludedFields": ["English support", "mode instructions", "interactive speaking openings", "unwritten AI replies"],
        "counts": {"lessons": 60, "placementsByField": placements, "uniqueExactTexts": len(rows),
                   "twoVoiceClips": len(rows) * 2, "unicodeCharactersPerVoice": count,
                   "unicodeCharactersBothVoices": count * 2},
        "exactTextSha256": sha("\n".join(row["text"] for row in rows).encode("utf-8")),
        "texts": rows,
    }
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "Japanese Breakfast audio inventory is stale"
        report = json.loads(expected)
        print(f"Japanese Breakfast audio inventory verified: {report['counts']}")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
