#!/usr/bin/env python3
"""Build private Japanese Breakfast Foundation 4–6 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/foundation-1-10-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-foundation-4-6.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    4: {
        "see": ("Find how the server answers the orange-juice question.", "reader", 4),
        "recall": ("Without looking, name a napkin in Japanese.", "cards", 8),
        "hear": ("Listen and identify 'freshly squeezed' in Japanese.", "cards", 3),
        "type": ("Type 'A fork, please' in Japanese.", "cards", 11),
        "say": ("Ask whether the café has orange juice.", "reader", 3),
        "write": ("Write the request for tea after hearing the answer.", "reader", 7),
    },
    5: {
        "see": ("Find where the server says card payment is possible.", "reader", 8),
        "recall": ("Without looking, name takeaway in Japanese.", "cards", 3),
        "hear": ("Listen and identify the word for register.", "cards", 8),
        "type": ("Type 'I will eat here' in Japanese.", "cards", 2),
        "say": ("Ask whether you may sit outside.", "reader", 3),
        "write": ("Write the guest's card-payment question.", "reader", 7),
    },
    6: {
        "see": ("Find what the first guest usually eats for breakfast.", "reader", 4),
        "recall": ("Without looking, name rice in Japanese.", "cards", 7),
        "hear": ("Listen and identify the phrase 'every morning'.", "cards", 2),
        "type": ("Type 'What do you eat?' in Japanese.", "cards", 11),
        "say": ("Ask whether the other person drinks coffee or tea.", "reader", 5),
        "write": ("Write what the second guest eats for breakfast.", "reader", 8),
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
