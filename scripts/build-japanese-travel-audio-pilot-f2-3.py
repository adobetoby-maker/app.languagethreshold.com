#!/usr/bin/env python3
"""Pin five exact Japanese Breakfast Foundation 2–3 strings for private audio."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/private-audio-scope-ja-en.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-audio-pilot-foundation-2-3.json"
PILOT_TEXTS = (
    "二はい",
    "コーヒーを二はいください。",
    "千円ですか。",
    "あまい",
    "このパンはあまいですか。",
)
LESSON_IDS = {"foundation-travel-breakfast:2:ja-en", "foundation-travel-breakfast:3:ja-en"}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build():
    source = json.loads(SOURCE.read_text())
    assert source["pairKey"] == "Japanese:English" and source["locale"] == "ja-JP"
    assert source["reviewed"] is source["recordingsGenerated"] is False
    by_text = {row["text"]: row for row in source["texts"]}
    assert len(by_text) == source["counts"]["uniqueExactTexts"]
    rows = []
    for phrase in PILOT_TEXTS:
        row = by_text[phrase]
        assert row["sha256"] == digest(phrase.encode("utf-8"))
        assert any(item["lessonId"] in LESSON_IDS for item in row["occurrences"])
        rows.append(row)
    return {
        "schema": 1,
        "state": "private-audio-pilot-unsynthesized",
        "moduleId": "travel-breakfast",
        "pairKey": "Japanese:English",
        "locale": "ja-JP",
        "draftLessonIds": sorted(LESSON_IDS),
        "sourceDraftSha256": source["sourceSha256"],
        "sourceInventorySha256": source["exactTextSha256"],
        "reviewed": False,
        "recordingsGenerated": False,
        "listeningReviewed": False,
        "registered": False,
        "counts": {
            "uniqueExactTexts": len(rows),
            "twoVoiceClips": len(rows) * 2,
            "unicodeCharactersPerVoice": sum(len(row["text"]) for row in rows),
        },
        "exactTextSha256": digest("\n".join(row["text"] for row in rows).encode("utf-8")),
        "texts": rows,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == encoded, "Japanese Breakfast pilot inventory is stale"
    else:
        OUTPUT.write_text(encoded)
    print("Japanese Breakfast Foundation 2–3 private audio pilot verified")


if __name__ == "__main__":
    main()
