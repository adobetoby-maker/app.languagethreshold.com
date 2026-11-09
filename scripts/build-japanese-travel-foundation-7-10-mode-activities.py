#!/usr/bin/env python3
"""Build private Japanese Breakfast Foundation 7–10 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/foundation-1-10-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-foundation-7-10.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    7: {
        "see": ("Find what the host says about this room plan's breakfast price.", "reader", 3),
        "recall": ("Without looking, name a recommendation in Japanese.", "cards", 6),
        "hear": ("Listen and identify the Japanese question word 'where'.", "cards", 2),
        "type": ("Type 'What is this bread called?' in Japanese.", "cards", 10),
        "say": ("Ask where the restroom is.", "reader", 4),
        "write": ("Write the host's name for the bread.", "reader", 7),
    },
    8: {
        "see": ("Find how the guest asks for less sugar.", "reader", 7),
        "recall": ("Without looking, name allergy in Japanese.", "cards", 10),
        "hear": ("Listen and identify the Japanese word for ingredients.", "cards", 11),
        "type": ("Type 'I have not decided' in Japanese.", "cards", 2),
        "say": ("Tell the server you do not eat meat and ask for a dish without it.", "reader", 4),
        "write": ("Write the guest's request for another coffee.", "reader", 6),
    },
    9: {
        "see": ("Find where the server says the guest should pay.", "reader", 5),
        "recall": ("Without looking, name change in Japanese.", "cards", 6),
        "hear": ("Listen and identify the Japanese word for cash.", "cards", 4),
        "type": ("Type 'The bill, please' in Japanese.", "cards", 10),
        "say": ("Ask the server whether you may pay by card.", "reader", 6),
        "write": ("Write the guest's request for a glass of water.", "reader", 1),
    },
    10: {
        "see": ("Find how the server explains the seasonal recommendation again.", "reader", 4),
        "recall": ("Without looking, name ingredients in Japanese.", "cards", 9),
        "hear": ("Listen and identify 'one more time' in Japanese.", "cards", 4),
        "type": ("Type 'I do not understand' in Japanese.", "cards", 2),
        "say": ("Ask the server to repeat the explanation slowly.", "reader", 3),
        "write": ("Write how the guest asks about the ingredients.", "reader", 5),
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
    assert len(result["activities"]) == 24
    assert len({item["id"] for item in result["activities"]}) == 24
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private Foundation activities are stale"
        print("24 private Japanese Foundation activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
