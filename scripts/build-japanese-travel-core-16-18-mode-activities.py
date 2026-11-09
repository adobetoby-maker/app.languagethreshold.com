#!/usr/bin/env python3
"""Build private Japanese Breakfast Core 16–18 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-core-16-18.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    16: {
        "see": ("Find the request for a smaller portion of the egg dish.", "reader", 7),
        "recall": ("Without looking, name a stroller in Japanese.", "cards", 1),
        "hear": ("Listen and identify the Japanese word for aisle.", "cards", 6),
        "type": ("Type the question about room for a stroller in Japanese.", "reader", 2),
        "say": ("Ask whether the restaurant has a high chair.", "reader", 5),
        "write": ("Write how staff answers the smaller-portion request.", "reader", 8),
    },
    17: {
        "see": ("Find the request to inspect the table before choosing a seat.", "reader", 3),
        "recall": ("Without looking, name a step in Japanese.", "cards", 2),
        "hear": ("Listen and identify the Japanese term for wheelchair.", "cards", 1),
        "type": ("Type the question about a step-free entrance in Japanese.", "reader", 1),
        "say": ("Ask to see the route to the restroom.", "reader", 7),
        "write": ("Write the guest's decision after checking the space.", "reader", 9),
    },
    18: {
        "see": ("Find the question about shared tongs.", "reader", 4),
        "recall": ("Without looking, name a nut allergy in Japanese.", "cards", 1),
        "hear": ("Listen and identify the Japanese term for shared use.", "cards", 3),
        "type": ("Type the question about the toaster and milk jug in Japanese.", "reader", 6),
        "say": ("State the nut allergy and ask to check before ordering.", "reader", 1),
        "write": ("Write the guest's response after staff cannot verify the handling.", "reader", 8),
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
