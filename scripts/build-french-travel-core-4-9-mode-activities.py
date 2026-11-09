#!/usr/bin/env python3
"""Build source-pinned, private six-mode activities for French Breakfast Core 4–9."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-mode-activities-core-4-9.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    4: {
        "see": ("Find how the traveler wants the eggs prepared.", "line:7"),
        "recall": ("Recall the French phrase for 'without salt'.", "word:12"),
        "hear": ("Listen for the order of two scrambled eggs.", "word:13"),
        "type": ("Type the question about whether coffee is included.", "word:17"),
        "say": ("Ask what comes with breakfast.", "word:18"),
        "write": ("Write the waitress's answer about the coffee.", "line:9"),
    },
    5: {
        "see": ("Find the hotel's breakfast hours in the answer.", "line:5"),
        "recall": ("Recall the French word for the dining room.", "word:2"),
        "hear": ("Listen for the question about breakfast being included.", "word:11"),
        "type": ("Type the traveler's room number statement.", "word:13"),
        "say": ("Ask for the breakfast hours.", "word:12"),
        "write": ("Write the receptionist's explanation of the buffet rules.", "line:8"),
    },
    6: {
        "see": ("Find the speaker's direct statement about a nut allergy.", "line:2"),
        "recall": ("Recall the French term for peanuts.", "word:3"),
        "hear": ("Listen for the direct nut-allergy statement.", "word:11"),
        "type": ("Type the question about the ingredients.", "word:12"),
        "say": ("Ask the server to check with the kitchen.", "word:14"),
        "write": ("Write the question about gluten in the bread.", "word:16"),
    },
    7: {
        "see": ("Find what guests in this café order in the morning.", "line:4"),
        "recall": ("Recall the French term for buttered tartines.", "word:4"),
        "hear": ("Listen for Ana's question about local breakfast.", "word:11"),
        "type": ("Type the request to explain what the dish contains.", "word:15"),
        "say": ("Ask the server to recommend a typical dish.", "word:14"),
        "write": ("Write what Ana orders after the explanation.", "line:8"),
    },
    8: {
        "see": ("Find what the mother-in-law orders.", "line:6"),
        "recall": ("Recall the French term for decaf coffee.", "word:9"),
        "hear": ("Listen for the request to order for everyone.", "word:13"),
        "type": ("Type 'Without cheese, please' in French.", "word:16"),
        "say": ("Ask the waiter to repeat the order.", "word:17"),
        "write": ("Write how the speaker checks who the tea is for.", "line:7"),
    },
    9: {
        "see": ("Find what the waitress offers for the takeaway order.", "line:4"),
        "recall": ("Recall the French term for a paper bag.", "word:5"),
        "hear": ("Listen for the question about ordering coffee to go.", "word:12"),
        "type": ("Type the request for napkins and a spoon.", "word:14"),
        "say": ("Ask whether the takeaway coffee comes with a lid.", "word:16"),
        "write": ("Write the request to put the pastry in a paper bag.", "line:7"),
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
