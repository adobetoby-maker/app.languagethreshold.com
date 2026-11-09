#!/usr/bin/env python3
"""Build private Japanese Breakfast Core 19–21 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-core-19-21.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    19: {
        "see": ("Find why table seating costs more at this café.", "reader", 6),
        "recall": ("Without looking, name an additional charge in Japanese.", "cards", 6),
        "hear": ("Listen and identify the Japanese term for tax included.", "cards", 8),
        "type": ("Type the question about different prices in Japanese.", "reader", 5),
        "say": ("Choose a counter seat and ask for the total.", "reader", 7),
        "write": ("Write the staff response giving the tax-inclusive total.", "reader", 8),
    },
    20: {
        "see": ("Find the line showing breakfast is included in the booking.", "reader", 4),
        "recall": ("Without looking, name a booking confirmation email in Japanese.", "cards", 2),
        "hear": ("Listen and identify the Japanese word for itemized bill.", "cards", 5),
        "type": ("Type the request for a corrected bill in Japanese.", "reader", 7),
        "say": ("Point out the breakfast charge on the bill.", "reader", 2),
        "write": ("Write how staff confirms the room plan has no separate breakfast charge.", "reader", 6),
    },
    21: {
        "see": ("Find why the smaller table will not work for the stroller.", "reader", 4),
        "recall": ("Without looking, name another seat in Japanese.", "cards", 7),
        "hear": ("Listen and identify the Japanese word for aisle.", "cards", 5),
        "type": ("Type the question asking when the reservation begins.", "reader", 6),
        "say": ("Ask to check whether the stroller fits before moving.", "reader", 3),
        "write": ("Write the guest's request to decide after looking at the seat.", "reader", 8),
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
