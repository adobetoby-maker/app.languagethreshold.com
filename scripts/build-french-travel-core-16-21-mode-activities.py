#!/usr/bin/env python3
"""Build source-pinned, private six-mode activities for French Breakfast Core 16–21."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-mode-activities-core-16-21.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    16: {
        "see": ("Find where the waiter offers the family a table.", "line:3"),
        "recall": ("Recall the French term for a high chair.", "word:1"),
        "hear": ("Listen for the question about room for the stroller.", "word:13"),
        "type": ("Type the question about a child portion in French.", "word:14"),
        "say": ("Ask the waiter for a high chair.", "word:12"),
        "write": ("Write the request to make the dish without chili.", "word:15"),
    },
    17: {
        "see": ("Find where the waiter says the ramp is.", "line:3"),
        "recall": ("Recall the French term for an accessible restroom.", "word:9"),
        "hear": ("Listen for the question about a step-free entrance.", "word:13"),
        "type": ("Type the question about room for a wheelchair.", "word:14"),
        "say": ("Ask to see the table before sitting down.", "word:17"),
        "write": ("Write Elena's check of the table height and the waiter's response.", "line:6"),
    },
    18: {
        "see": ("Find the barista's description of the shared pastry tongs.", "line:4"),
        "recall": ("Recall the French term for cross-contact.", "word:8"),
        "hear": ("Listen for the direct statement about a nut allergy.", "word:12"),
        "type": ("Type the question about using the same tongs.", "word:14"),
        "say": ("Ask whether the toaster and milk jug are shared.", "word:15"),
        "write": ("Write the barista's statement about cross-contact at the counter.", "line:7"),
    },
    19: {
        "see": ("Find the counter and table prices listed on this café's menu.", "line:2"),
        "recall": ("Recall the French word for a surcharge.", "word:9"),
        "hear": ("Listen for the question about the table price.", "word:12"),
        "type": ("Type the question about a terrace surcharge.", "word:15"),
        "say": ("Tell the waiter you will have coffee at the counter.", "word:14"),
        "write": ("Write the price the waiter quotes from the menu for the terrace.", "line:6"),
    },
    20: {
        "see": ("Find what the receptionist discovers about the room rate.", "line:6"),
        "recall": ("Recall the French term for a corrected bill.", "word:12"),
        "hear": ("Listen for the booking statement about included breakfast.", "word:14"),
        "type": ("Type the request to explain the breakfast charge.", "word:15"),
        "say": ("Ask the receptionist for a new receipt.", "word:17"),
        "write": ("Write how the traveler shows the confirmation email and explains the booking.", "line:4"),
    },
    21: {
        "see": ("Find the time the reserved group will arrive.", "line:6"),
        "recall": ("Recall the French word for a stroller.", "word:7"),
        "hear": ("Listen for the family's reason for preferring this table.", "word:11"),
        "type": ("Type the question about the reservation's arrival time.", "word:12"),
        "say": ("Propose finishing at the table before 10:15.", "word:13"),
        "write": ("Write the server's reply about the shaded patio and extra chair.", "line:8"),
    },
}


def build():
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)
    assert source["releaseGate"]["enabled"] is False
    lessons = {row["draftLessonKey"]: row for row in source["lessons"]}
    result = {
        "schema": 1,
        "purpose": "private authored activity pilot; not learner-facing",
        "sourceFixture": str(SOURCE.relative_to(ROOT)),
        "sourceSha256": hashlib.sha256(source_bytes).hexdigest(),
        "targetLanguage": "French",
        "nativeLanguage": "English",
        "reviewed": False,
        "registered": False,
        "audioListeningReviewed": False,
        "activities": [],
    }
    for number, plan in PLAN.items():
        assert tuple(plan) == MODES
        key = f"core:{number}"
        lesson = lessons[key]
        for mode, (cue, short_ref) in plan.items():
            kind, ordinal = short_ref.split(":")
            ref = f"{key}:{kind}:{ordinal}"
            collection = lesson["reader"] if kind == "line" else lesson["words"]
            matches = [item for item in collection if item["id"] == ref]
            assert len(matches) == 1, ref
            item = matches[0]
            result["activities"].append({
                "id": f"{key}:{mode}:pilot-1",
                "lessonKey": key,
                "mode": mode,
                "cueEnglish": cue,
                "sourceRef": ref,
                "modelFrench": item["targetFrench"],
                "modelEnglish": item["supportEnglish"],
                "responseKind": "open" if mode in ("say", "write") else "fixed",
                "recordedAudioRequired": mode == "hear",
                "readyForLearner": False,
            })
    assert len(result["activities"]) == 36
    assert len({x["id"] for x in result["activities"]}) == 36
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private mode activities are stale"
        print("36 private activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
