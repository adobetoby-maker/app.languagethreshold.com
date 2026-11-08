#!/usr/bin/env python3
"""Build private Japanese Breakfast Core 4–6 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-core-4-6.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    4: {
        "see": ("Find what comes with the breakfast set.", "reader", 2),
        "recall": ("Without looking, name scrambled eggs in Japanese.", "cards", 4),
        "hear": ("Listen and identify the Japanese word for toast.", "cards", 5),
        "type": ("Type 'What comes with it?' in Japanese.", "cards", 12),
        "say": ("Ask whether coffee is included in the set.", "reader", 8),
        "write": ("Write what the server says about the extra coffee charge.", "reader", 9),
    },
    5: {
        "see": ("Find how staff checks the guest's breakfast plan.", "reader", 4),
        "recall": ("Without looking, name the dining room in Japanese.", "cards", 4),
        "hear": ("Listen and identify the Japanese word for buffet.", "cards", 8),
        "type": ("Type 'What are the breakfast hours?' in Japanese.", "reader", 6),
        "say": ("Ask the guest for their room number.", "reader", 2),
        "write": ("Write the hotel's breakfast hours.", "reader", 7),
    },
    6: {
        "see": ("Find what the staff says about shared cooking utensils.", "reader", 4),
        "recall": ("Without looking, name cooking utensils in Japanese.", "cards", 9),
        "hear": ("Listen and identify the Japanese word for peanuts.", "cards", 3),
        "type": ("Type 'I have a nut allergy' in Japanese.", "cards", 13),
        "say": ("Ask staff to check the bread's ingredients.", "reader", 2),
        "write": ("Write the companion's decision about this bread.", "reader", 7),
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
