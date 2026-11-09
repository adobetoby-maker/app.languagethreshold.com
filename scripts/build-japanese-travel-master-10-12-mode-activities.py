#!/usr/bin/env python3
"""Build private Japanese Breakfast Master 10–12 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/master-10-12-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-master-10-12.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    10: {
        "see": ("Find the pickup time and where the group should meet.", "reader", 4),
        "recall": ("Without looking, name altitude sickness in Japanese.", "cards", 15),
        "hear": ("Listen for the host's report about coca tea and altitude sickness.", "reader", 11),
        "type": ("Type the question about checking the market's opening time and distance.", "reader", 5),
        "say": ("Propose the market if time and health allow, or breakfast at the lodge otherwise.", "reader", 9),
        "write": ("Write how the group will prepare before deciding on breakfast.", "reader", 8),
    },
    11: {
        "see": ("Find what the group checks before departure besides jackets and headlamps.", "reader", 8),
        "recall": ("Without looking, name the trailhead in Japanese.", "cards", 6),
        "hear": ("Listen for the expected time until the bread is ready.", "reader", 1),
        "type": ("Type the request to be told when the exact time is known.", "reader", 2),
        "say": ("Ask Misaki to check the packed lunches.", "reader", 5),
        "write": ("Write when the group will decide its departure time.", "reader", 10),
    },
    12: {
        "see": ("Find the host's preference for how guests should address them.", "reader", 5),
        "recall": ("Without looking, name the polite way of speaking in Japanese.", "cards", 4),
        "hear": ("Listen for the polite request to pass the sugar.", "reader", 8),
        "type": ("Type the request for a little more coffee to the host.", "reader", 4),
        "say": ("Explain how to adjust address and formality to the other person's preference.", "reader", 6),
        "write": ("Write when the casual way of asking for sugar sounds natural.", "reader", 10),
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
