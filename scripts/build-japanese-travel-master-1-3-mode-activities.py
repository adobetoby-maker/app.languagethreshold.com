#!/usr/bin/env python3
"""Build private Japanese Breakfast Master 1–3 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/master-1-3-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-master-1-3.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    1: {
        "see": ("Find the first step in this café's breakfast routine.", "reader", 3),
        "recall": ("Without looking, name a numbered ticket in Japanese.", "cards", 10),
        "hear": ("Listen and identify the Japanese word for payment.", "cards", 8),
        "type": ("Type the question about where to pick up the drink.", "reader", 7),
        "say": ("Explain the order of checking the sign, paying, and picking up the order.", "reader", 10),
        "write": ("Write what happens at the register before pickup.", "reader", 5),
    },
    2: {
        "see": ("Find how staff distinguishes the small and large bread sizes.", "reader", 4),
        "recall": ("Without looking, say that choices vary by shop in Japanese.", "cards", 12),
        "hear": ("Listen and identify the Japanese phrase for preparation method.", "cards", 11),
        "type": ("Type the question asking which bread is smaller.", "reader", 2),
        "say": ("Say that you avoid dairy and ask staff to check ingredients.", "reader", 7),
        "write": ("Write the customer's final sequence for checking the bread order.", "reader", 10),
    },
    3: {
        "see": ("Find the staff response about the drink's temperature.", "reader", 7),
        "recall": ("Without looking, name steam in Japanese.", "cards", 17),
        "hear": ("Listen and identify the Japanese word for lukewarm.", "cards", 18),
        "type": ("Type the question asking the total price.", "reader", 6),
        "say": ("Greet the staff member and order hot cocoa.", "reader", 2),
        "write": ("Write the customer's sentence about waiting before drinking.", "reader", 9),
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
        assert lesson_id == f"master-travel-breakfast:{n}:ja-en"
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
        assert OUTPUT.read_text() == expected, "private Master activities are stale"
        print("18 private Japanese Master activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
