#!/usr/bin/env python3
"""Build private Japanese Breakfast Core 25–30 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-core-25-30.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    25: {
        "see": ("Find the customer's sentence describing the spill and burn.", "reader", 1),
        "recall": ("Without looking, name a burn in Japanese.", "cards", 16),
        "hear": ("Listen and identify the Japanese word for skin.", "cards", 17),
        "type": ("Type the request for cold water in Japanese.", "reader", 3),
        "say": ("Ask whether staff has a first-aid kit.", "reader", 5),
        "write": ("Write the staff offer made as an apology.", "reader", 10),
    },
    26: {
        "see": ("Find how staff describes the available space and busy periods.", "reader", 2),
        "recall": ("Without looking, name a power outlet in Japanese.", "cards", 5),
        "hear": ("Listen and identify the Japanese word for Wi-Fi.", "cards", 7),
        "type": ("Type the question about an outlet seat in Japanese.", "reader", 6),
        "say": ("Ask whether you may work here for about two hours.", "reader", 1),
        "write": ("Write the guest's response if the café gets busy.", "reader", 3),
    },
    27: {
        "see": ("Find what staff says about checking a packed breakfast request.", "reader", 5),
        "recall": ("Without looking, name a packed breakfast in Japanese.", "cards", 5),
        "hear": ("Listen and identify the Japanese phrase for airport transfer.", "cards", 3),
        "type": ("Type the question about pickup time and place in Japanese.", "reader", 9),
        "say": ("State the nut allergy and ask about ingredients and preparation.", "reader", 6),
        "write": ("Write the guest's choice if the ingredients cannot be verified.", "reader", 8),
    },
    28: {
        "see": ("Find what the regular customer says about the morning market.", "reader", 6),
        "recall": ("Without looking, name neighborhood in Japanese.", "cards", 2),
        "hear": ("Listen and identify the Japanese word for market.", "cards", 5),
        "type": ("Type the question about living in this area.", "reader", 3),
        "say": ("Ask the regular customer to tell you a little more.", "reader", 7),
        "write": ("Write the visitor's polite closing at the end of the conversation.", "reader", 9),
    },
    29: {
        "see": ("Find where the café says customers pay.", "reader", 7),
        "recall": ("Without looking, name splitting the bill in Japanese.", "cards", 3),
        "hear": ("Listen and identify the Japanese word for tip.", "cards", 8),
        "type": ("Type the question about whether a tip is needed.", "reader", 8),
        "say": ("Thank the other person and offer to pay next time.", "reader", 4),
        "write": ("Write the guest's closing thanks for the treat.", "reader", 10),
    },
    30: {
        "see": ("Find the staff correction to the bill's headcount.", "reader", 13),
        "recall": ("Without looking, name a high chair in Japanese.", "cards", 1),
        "hear": ("Listen and identify the Japanese phrase for itemized bill.", "cards", 9),
        "type": ("Type the request to check the child's nut allergy and ingredients.", "reader", 6),
        "say": ("Ask for a high chair at the start of the visit.", "reader", 1),
        "write": ("Write the family's polite closing sentence.", "reader", 16),
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
    assert len(result["activities"]) == 36
    assert len({item["id"] for item in result["activities"]}) == 36
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private Core activities are stale"
        print("36 private Japanese Core activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
