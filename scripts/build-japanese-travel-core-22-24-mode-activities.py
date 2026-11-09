#!/usr/bin/env python3
"""Build private Japanese Breakfast Core 22–24 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-core-22-24.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    22: {
        "see": ("Find where the customer is asked to pay first.", "reader", 2),
        "recall": ("Without looking, name the register in Japanese.", "cards", 2),
        "hear": ("Listen and identify the Japanese phrase for pay later.", "cards", 6),
        "type": ("Type the question about paying first in Japanese.", "reader", 1),
        "say": ("Ask whether you may sit at a table for a while.", "reader", 8),
        "write": ("Write where the sugar is according to staff.", "reader", 7),
    },
    23: {
        "see": ("Find the bakery's listed opening time and the plan to check it.", "reader", 4),
        "recall": ("Without looking, name a traffic light in Japanese.", "cards", 10),
        "hear": ("Listen and identify the Japanese phrase for on foot.", "cards", 7),
        "type": ("Type the question about the bakery's opening time.", "reader", 3),
        "say": ("Ask whether you can walk to the bakery from here.", "reader", 5),
        "write": ("Write the direction to turn at the second traffic light.", "reader", 7),
    },
    24: {
        "see": ("Find the person's observed condition in the witness statement.", "reader", 7),
        "recall": ("Without looking, name an ambulance in Japanese.", "cards", 3),
        "hear": ("Listen and identify the Japanese phrase for emergency call.", "cards", 12),
        "type": ("Type the request to call an ambulance in Japanese.", "reader", 4),
        "say": ("Say that the person at the next table fell to the floor.", "reader", 3),
        "write": ("Write what staff says they will report to the operator.", "reader", 8),
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
