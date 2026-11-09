#!/usr/bin/env python3
"""Build source-pinned, private six-mode activities for French Breakfast Core 10–15."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-mode-activities-core-10-15.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    10: {
        "see": ("Find the wrong drink the server gives the traveler.", "line:2"),
        "recall": ("Recall the French word for a receipt.", "word:3"),
        "hear": ("Listen for the traveler explaining which coffee was ordered.", "word:12"),
        "type": ("Type the request to check the order.", "word:16"),
        "say": ("Tell the server that a pastry is missing.", "word:13"),
        "write": ("Write how the traveler asks for the coffee to be changed.", "line:7"),
    },
    11: {
        "see": ("Find what the traveler plans to visit if it does not rain.", "line:6"),
        "recall": ("Recall the French word for the weather forecast.", "word:5"),
        "hear": ("Listen for the barista's morning greeting.", "word:12"),
        "type": ("Type the traveler's statement about still being sleepy.", "word:14"),
        "say": ("Ask someone to repeat more slowly.", "word:16"),
        "write": ("Write the traveler's reply when the barista wishes them a good day.", "line:9"),
    },
    12: {
        "see": ("Find what the waitress says the extra charge is.", "line:4"),
        "recall": ("Recall the French term for a service charge.", "word:4"),
        "hear": ("Listen for the question about the charge.", "word:14"),
        "type": ("Type the question about whether the tip is included.", "word:15"),
        "say": ("Ask whether you can pay by card.", "word:16"),
        "write": ("Write what the traveler requests after paying.", "line:8"),
    },
    13: {
        "see": ("Find how the traveler describes the pastry's texture.", "line:4"),
        "recall": ("Recall the French word for a recipe.", "word:6"),
        "hear": ("Listen for the compliment about the coffee.", "word:14"),
        "type": ("Type the question about whether the pastry is a house recipe.", "word:16"),
        "say": ("Compliment the cook on the breakfast.", "word:13"),
        "write": ("Write what the cook says about the pastry's recipe.", "line:6"),
    },
    14: {
        "see": ("Find the preparation time the waitress reports from the kitchen.", "line:6"),
        "recall": ("Recall the French word for the kitchen.", "word:12"),
        "hear": ("Listen for the traveler's twelve-minute constraint.", "word:17"),
        "type": ("Type the question about how long preparation takes.", "word:15"),
        "say": ("Ask what the café can prepare fastest.", "word:14"),
        "write": ("Write how the traveler asks for breakfast to go.", "word:16"),
    },
    15: {
        "see": ("Find how the traveler corrects the milk in the coffee.", "line:5"),
        "recall": ("Recall the French term for oat milk.", "word:5"),
        "hear": ("Listen for the direct statement about not having dairy.", "word:13"),
        "type": ("Type the correction that oat milk was ordered.", "word:14"),
        "say": ("Ask the waitress for a table for one.", "word:11"),
        "write": ("Write what the traveler ordered with the americano.", "line:3"),
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
