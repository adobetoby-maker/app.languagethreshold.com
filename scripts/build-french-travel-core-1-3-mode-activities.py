#!/usr/bin/env python3
"""Build source-pinned, private six-mode activities for French Breakfast Core 1–3."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-mode-activities-core-1-3.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    1: {
        "see": ("Find where the traveler is told to order.", "line:5"),
        "recall": ("Recall the French phrase for a free table.", "word:4"),
        "hear": ("Listen for the question about ordering at the counter.", "word:11"),
        "type": ("Type the request to repeat after not understanding.", "word:14"),
        "say": ("Ask the waitress whether there is a free table.", "word:12"),
        "write": ("Write where the waitress says a table is available.", "line:7"),
    },
    2: {
        "see": ("Find the two coffee types the barista names.", "line:3"),
        "recall": ("Recall the French term for oat milk.", "word:4"),
        "hear": ("Listen for the question about available coffee sizes.", "word:14"),
        "type": ("Type the request for coffee with milk in French.", "word:15"),
        "say": ("Ask whether the café has oat milk.", "word:16"),
        "write": ("Write the traveler's choice of a medium coffee with milk.", "line:4"),
    },
    3: {
        "see": ("Find how the employee contrasts the cheese pastry and brioche.", "line:6"),
        "recall": ("Recall the French term for a croissant.", "word:11"),
        "hear": ("Listen for the question about what is fresh today.", "word:13"),
        "type": ("Type the question about whether a pastry is sweet or savory.", "word:16"),
        "say": ("Ask the bakery employee what they recommend.", "word:17"),
        "write": ("Write what the traveler orders at the end.", "line:9"),
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
    assert len(result["activities"]) == 18
    assert len({x["id"] for x in result["activities"]}) == 18
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private mode activities are stale"
        print("18 private activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
