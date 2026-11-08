#!/usr/bin/env python3
"""Build private Japanese Breakfast Core 13–15 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-core-13-15.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    13: {
        "see": ("Find how the customer describes the pastry's texture.", "reader", 4),
        "recall": ("Without looking, name aroma in Japanese.", "cards", 1),
        "hear": ("Listen and identify the Japanese word for crisp.", "cards", 3),
        "type": ("Type 'I would like to return' in Japanese.", "cards", 12),
        "say": ("Ask the server to pass your compliment to the baker.", "reader", 7),
        "write": ("Write what the customer says about the coffee's aroma.", "reader", 3),
    },
    14: {
        "see": ("Find how long the sandwich may take.", "reader", 5),
        "recall": ("Without looking, name takeaway in Japanese.", "cards", 7),
        "hear": ("Listen and identify the Japanese word for tour.", "cards", 3),
        "type": ("Type 'Can I pay first?' in Japanese.", "cards", 12),
        "say": ("Ask whether a quick breakfast is available.", "reader", 2),
        "write": ("Write the customer's final takeaway choice.", "reader", 6),
    },
    15: {
        "see": ("Find what milk the order was confirmed with.", "reader", 7),
        "recall": ("Without looking, name oat milk in Japanese.", "cards", 6),
        "hear": ("Listen and identify the Japanese term for dairy products.", "cards", 4),
        "type": ("Type 'Please check ingredients and handling' in Japanese.", "cards", 14),
        "say": ("Tell the server you will not drink this coffee.", "reader", 8),
        "write": ("Write what the customer asks to pay for at the end.", "reader", 11),
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
