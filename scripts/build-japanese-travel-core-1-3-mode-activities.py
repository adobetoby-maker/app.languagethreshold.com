#!/usr/bin/env python3
"""Build private Japanese Breakfast Core 1–3 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-core-1-3.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    1: {
        "see": ("Find where the queue forms in the busy café.", "reader", 2),
        "recall": ("Without looking, name the counter in Japanese.", "cards", 4),
        "hear": ("Listen and identify the Japanese word for takeaway.", "cards", 12),
        "type": ("Type 'Is a seat available?' in Japanese.", "cards", 10),
        "say": ("Ask whether you should order here.", "reader", 3),
        "write": ("Write where the available seat is.", "reader", 6),
    },
    2: {
        "see": ("Find what coffee choices the server offers.", "reader", 2),
        "recall": ("Without looking, name oat milk in Japanese.", "cards", 6),
        "hear": ("Listen and identify the Japanese word for hot or warm.", "cards", 9),
        "type": ("Type 'Do you have oat milk?' in Japanese.", "cards", 14),
        "say": ("Order a small hot blend coffee.", "reader", 7),
        "write": ("Write what the server says is available instead of oat milk.", "reader", 6),
    },
    3: {
        "see": ("Find which pastries were baked this morning.", "reader", 3),
        "recall": ("Without looking, name the filling in Japanese.", "cards", 7),
        "hear": ("Listen and identify the word for croissant.", "cards", 9),
        "type": ("Type 'What is inside?' in Japanese.", "cards", 13),
        "say": ("Ask the server what they recommend.", "reader", 8),
        "write": ("Write the server's recommendation and when it was baked.", "reader", 9),
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
        assert OUTPUT.read_text() == expected, "private Foundation activities are stale"
        print("18 private Japanese Core activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
