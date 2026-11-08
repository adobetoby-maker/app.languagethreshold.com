#!/usr/bin/env python3
"""Build private Japanese Breakfast Core 7–9 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-core-7-9.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    7: {
        "see": ("Find what comes with the rice-ball set.", "reader", 4),
        "recall": ("Without looking, name miso soup in Japanese.", "cards", 7),
        "hear": ("Listen and identify the Japanese word for pickles.", "cards", 8),
        "type": ("Type 'What is popular at this shop?' in Japanese.", "cards", 13),
        "say": ("Ask the server what is inside the rice balls.", "reader", 5),
        "write": ("Write what today's rice-ball filling is.", "reader", 6),
    },
    8: {
        "see": ("Find what the friend ordered.", "reader", 4),
        "recall": ("Without looking, say 'for the child' in Japanese.", "cards", 5),
        "hear": ("Listen and identify the Japanese word for black tea.", "cards", 7),
        "type": ("Type 'Please check the order' in Japanese.", "cards", 12),
        "say": ("Order coffee with milk and an egg dish for yourself.", "reader", 3),
        "write": ("Write how the server confirms the child's items.", "reader", 8),
    },
    9: {
        "see": ("Find why the server can change the coffee order.", "reader", 3),
        "recall": ("Without looking, name a paper bag in Japanese.", "cards", 6),
        "hear": ("Listen and identify the Japanese word for napkin.", "cards", 8),
        "type": ("Type 'Can it be made takeaway?' in Japanese.", "cards", 12),
        "say": ("Ask for one napkin.", "reader", 8),
        "write": ("Write what the server says about the lid.", "reader", 5),
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
