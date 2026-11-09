#!/usr/bin/env python3
"""Build private Japanese Breakfast Core 10–12 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-core-10-12.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    10: {
        "see": ("Find how the coffee differs from what was ordered.", "reader", 3),
        "recall": ("Without looking, name the receipt in Japanese.", "cards", 2),
        "hear": ("Listen and identify the Japanese word for croissant.", "cards", 8),
        "type": ("Type 'The croissant is missing' in Japanese.", "cards", 12),
        "say": ("Ask the server to check your order.", "reader", 1),
        "write": ("Write what the server says they will bring.", "reader", 8),
    },
    11: {
        "see": ("Find the customer's plan if it does not rain.", "reader", 6),
        "recall": ("Without looking, name the weather in Japanese.", "cards", 2),
        "hear": ("Listen and identify the Japanese word for sleepy.", "cards", 8),
        "type": ("Type 'It is cold today, isn't it?' in Japanese.", "cards", 12),
        "say": ("Ask the customer where they are going today.", "reader", 5),
        "write": ("Write the server's final farewell.", "reader", 9),
    },
    12: {
        "see": ("Find why the drink has a separate charge.", "reader", 4),
        "recall": ("Without looking, name the itemized details in Japanese.", "cards", 2),
        "hear": ("Listen and identify the Japanese word for total.", "cards", 4),
        "type": ("Type 'Can I pay by card?' in Japanese.", "cards", 12),
        "say": ("Ask for the bill.", "reader", 1),
        "write": ("Write the total amount given by the server.", "reader", 6),
    },
}


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert source["target"] == "Japanese" and source["native"] == "English"
    assert source["reviewed"] is False and source["registered"] is False
    lessons = {lesson["n"]: lesson for lesson in source["lessons"]}
    result = {
        "schema": 1,
        "state": "private-authored-activity-draft",
        "pairKey": "Japanese:English",
        "source": str(SOURCE.relative_to(ROOT)),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "reviewed": False,
        "registered": False,
        "audioListeningReviewed": False,
        "activities": [],
    }
    for n, mode_plan in PLAN.items():
        assert tuple(mode_plan) == MODES
        lesson = lessons[n]
        lesson_id = lesson["stableId"]
        assert lesson_id == f"travel-breakfast:{n}:ja-en"
        for mode, (cue, field, ordinal) in mode_plan.items():
            assert ordinal >= 1
            item = lesson[field][ordinal - 1]
            assert item["ja"].strip() and item["en"].strip()
            result["activities"].append({
                "id": f"{lesson_id}:{mode}:pilot-1",
                "lessonId": lesson_id,
                "mode": mode,
                "cueEnglish": cue,
                "sourceRef": f"{lesson_id}:{field}:{ordinal}",
                "modelJapanese": item["ja"],
                "modelEnglish": item["en"],
                "responseKind": "open" if mode in ("say", "write") else "fixed",
                "recordedAudioRequired": mode == "hear",
                "readyForLearner": False,
            })
    assert len(result["activities"]) == 18
    assert len({item["id"] for item in result["activities"]}) == 18
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private Core activities are stale"
        print("18 private Japanese Core activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
