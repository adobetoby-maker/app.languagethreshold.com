#!/usr/bin/env python3
"""Build and verify the private, source-pinned F1–3 Japanese Roofing activities."""

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("content/japanese-roofing/foundation-1-3-draft.json")
OUTPUT = Path("content/japanese-roofing/private-mode-activities-foundation-1-3.json")
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each tuple points to an authored, aligned source pair. Cue wording is specific
# to the lesson task; references are one-based like the private Breakfast set.
SPEC = {
    1: (
        ("reader", 1, "Find Luis's morning greeting and introduction in the Reader."),
        ("cards", 5, "Recall the Japanese word for ladder without looking."),
        ("cards", 4, "Listen for the Japanese word for hammer and identify its meaning."),
        ("cards", 12, "Type the polite Japanese request for one more repetition."),
        ("reader", 5, "Ask a coworker how to say 'ladder' in Japanese."),
        ("reader", 7, "Write a polite request for your coworker to speak a little slower."),
    ),
    2: (
        ("reader", 4, "Find the number of bundles needed in today's Reader."),
        ("cards", 6, "Recall the Japanese expression for one bundle without looking."),
        ("reader", 2, "Listen and identify when the truck will arrive."),
        ("cards", 12, "Type the Japanese sentence 'We start at six.'"),
        ("reader", 3, "Ask how many bundles of shingles are needed today."),
        ("reader", 7, "Write the nail length in Japanese."),
    ),
    3: (
        ("reader", 1, "Find how Pedro identifies himself as the crew lead."),
        ("cards", 5, "Recall the Japanese expression for slippery without looking."),
        ("cards", 4, "Listen for the Japanese expression meaning wet."),
        ("cards", 9, "Type 'The roof is wet' in Japanese."),
        ("reader", 6, "Ask whether the equipment is ready."),
        ("reader", 3, "Write a Japanese sentence describing the wet roof's condition."),
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
    actual = json.loads(path.read_text())
    assert actual == expected, "Private activity file differs from source-pinned authored specification"
    print("Japanese Roofing F1–3: 18 exact-pair activities verified; private and disabled")


if __name__ == "__main__":
    main()
