#!/usr/bin/env python3
"""Build private Japanese Breakfast Foundation 1–3 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/foundation-1-10-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-foundation-1-3.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    1: {
        "see": ("Find how Sam asks whether there is a menu.", "reader", 5),
        "recall": ("Without looking, name tea in Japanese.", "cards", 3),
        "hear": ("Listen and identify the word for coffee.", "cards", 2),
        "type": ("Type the polite morning greeting in Japanese.", "cards", 1),
        "say": ("Ask whether the café has coffee and bread.", "reader", 7),
        "write": ("Write how Sam introduces himself.", "reader", 3),
    },
    2: {
        "see": ("Find what the server says the total is.", "reader", 6),
        "recall": ("Without looking, name yen in Japanese.", "cards", 5),
        "hear": ("Listen and identify the counter for two cups.", "cards", 1),
        "type": ("Type 'How much is it?' in Japanese.", "cards", 6),
        "say": ("Order two coffees politely.", "reader", 2),
        "write": ("Write the request for three pieces of bread.", "reader", 3),
    },
    3: {
        "see": ("Find how the server grants the available seat.", "reader", 2),
        "recall": ("Without looking, name 'cold to the touch' in Japanese.", "cards", 5),
        "hear": ("Listen and identify the word for sweet.", "cards", 6),
        "type": ("Type 'Is this seat available?' in Japanese.", "cards", 3),
        "say": ("Offer someone their coffee politely.", "reader", 4),
        "write": ("Write the guest's observation that the coffee is hot.", "reader", 5),
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
        assert lesson_id == f"foundation-travel-breakfast:{n}:ja-en"
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
        print("18 private Japanese Foundation activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
