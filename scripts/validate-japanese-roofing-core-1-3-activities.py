#!/usr/bin/env python3
"""Build and verify source-pinned private Japanese Roofing Core 1–3 activities."""

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("content/japanese-roofing/core-1-3-draft.json")
OUTPUT = Path("content/japanese-roofing/private-mode-activities-core-1-3.json")
MODES = ("see", "recall", "hear", "type", "say", "write")
SPEC = {
    1: (
        ("reader", 3, "Find whether the roof is flat or sloped."),
        ("cards", 9, "Recall the Japanese term for roof pitch."),
        ("cards", 3, "Listen for the Japanese term for a metal roof panel."),
        ("cards", 14, "Type the question asking whether this roof is flat or sloped."),
        ("cards", 11, "Ask what material this roof has."),
        ("reader", 7, "Write that there is also a skylight at the back."),
    ),
    2: (
        ("reader", 2, "Find what material forms the bottom roof-deck layer."),
        ("cards", 7, "Recall the Japanese term for the rake edge."),
        ("cards", 2, "Listen for the Japanese term for underlayment."),
        ("cards", 13, "Type the instruction to roll out the underlayment."),
        ("cards", 14, "Ask where the drip edge goes."),
        ("reader", 3, "Write that the roof deck must be dry and clean."),
    ),
    3: (
        ("reader", 4, "Find where the step flashing is located."),
        ("cards", 3, "Recall the Japanese term for a roof valley."),
        ("cards", 1, "Listen for the Japanese term for flashing."),
        ("cards", 13, "Type the question asking where this roof's valleys are."),
        ("cards", 12, "Ask someone to show where the flashing goes."),
        ("reader", 8, "Write the instruction to check for leaks at the valley."),
    ),
}


def build():
    source_bytes = (ROOT / SOURCE).read_bytes()
    source = json.loads(source_bytes)
    assert source["target"] == "Japanese" and source["native"] == "English"
    assert source["reviewed"] is False and source["registered"] is False
    assert {lesson["n"] for lesson in source["lessons"]} == set(SPEC)
    activities = []
    for lesson in source["lessons"]:
        lesson_id = lesson["stableId"]
        assert len(SPEC[lesson["n"]]) == len(MODES)
        for mode, (collection, index, cue) in zip(MODES, SPEC[lesson["n"]]):
            pair = lesson[collection][index - 1]
            assert pair["ja"] and pair["en"] and cue
            activities.append({
                "id": f"{lesson_id}:{mode}:private-1",
                "lessonId": lesson_id,
                "mode": mode,
                "cueEnglish": cue,
                "sourceRef": f"{lesson_id}:{collection}:{index}",
                "modelJapanese": pair["ja"],
                "modelEnglish": pair["en"],
                "responseKind": "open" if mode in ("say", "write") else "fixed",
                "recordedAudioRequired": mode == "hear",
                "readyForLearner": False,
            })
    assert len(activities) == 18 and len({a["id"] for a in activities}) == 18
    return {
        "schema": 1,
        "state": "private-authored-activity-draft",
        "pairKey": "Japanese:English",
        "source": str(SOURCE),
        "sourceSha256": hashlib.sha256(source_bytes).hexdigest(),
        "reviewed": False,
        "registered": False,
        "audioListeningReviewed": False,
        "activities": activities,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    expected = build()
    path = ROOT / OUTPUT
    if args.write:
        path.write_text(json.dumps(expected, ensure_ascii=False, indent=2) + "\n")
    assert json.loads(path.read_text()) == expected, "Core 1–3 activities differ from source-pinned specification"
    print("Japanese Roofing Core 1–3: 18 exact-pair activities verified; private and disabled")


if __name__ == "__main__":
    main()
