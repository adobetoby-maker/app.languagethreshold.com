#!/usr/bin/env python3
"""Build private Japanese Breakfast Master 7–9 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/master-7-9-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-master-7-9.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    7: {
        "see": ("Find the recorded coffee and breakfast counts on the order sheet.", "reader", 3),
        "recall": ("Without looking, ask how much remains in Japanese.", "cards", 14),
        "hear": ("Listen and identify the completed action 'paid' in Japanese.", "cards", 13),
        "type": ("Type the polite request for the total and remaining balance again.", "reader", 8),
        "say": ("Ask the cook to check the order sheet and payments together.", "reader", 2),
        "write": ("Write how the organizer pays the remaining balance and receives the receipt.", "reader", 10),
    },
    8: {
        "see": ("Find why removing visible almond pieces does not verify the ingredients or cross-contact.", "reader", 5),
        "recall": ("Without looking, name the epinephrine auto-injector in Japanese.", "cards", 17),
        "hear": ("Listen and identify the direct term for anaphylaxis in Japanese.", "cards", 15),
        "type": ("Type the question asking whether another product has an ingredient label.", "reader", 6),
        "say": ("Thank the server and decline the offer to remove almonds from the pastry.", "reader", 4),
        "write": ("Write that you have previously had anaphylaxis from tree nuts.", "reader", 11),
    },
    9: {
        "see": ("Find how the café au lait felt to the guest.", "reader", 4),
        "recall": ("Without looking, name a suggestion in Japanese.", "cards", 8),
        "hear": ("Listen and identify the word for lukewarm.", "cards", 3),
        "type": ("Type the suggestion to check the drink temperature before service.", "reader", 5),
        "say": ("Suggest making the menu board easier to read by separating items and enlarging prices.", "reader", 8),
        "write": ("Close the feedback by saying you support the new café.", "reader", 10),
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
