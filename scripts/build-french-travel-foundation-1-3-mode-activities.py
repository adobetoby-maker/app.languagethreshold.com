#!/usr/bin/env python3
"""Build source-pinned private six-mode activities for French Breakfast F1–3."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-mode-activities-foundation-1-3.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Cues are lesson-specific. The source reference supplies the exact answer pair.
PLAN = {
    1: {
        "see": ("Find what Sam orders after reading the menu.", "line:4"),
        "recall": ("Without looking, name the menu in French.", "word:8"),
        "hear": ("Listen for Rosa's greeting and question.", "word:11"),
        "type": ("Type 'Thank you very much, see you tomorrow!' in French.", "word:13"),
        "say": ("Introduce yourself to Rosa as Sam.", "word:12"),
        "write": ("Write what Sam orders to eat.", "line:7"),
    },
    2: {
        "see": ("Find the prices of coffee and juice.", "line:5"),
        "recall": ("Without looking, name the dozen in French.", "word:9"),
        "hear": ("Listen for the time: half past eight.", "word:15"),
        "type": ("Type 'Is that twelve euros?' in French.", "word:14"),
        "say": ("Order two long coffees politely.", "word:11"),
        "write": ("Write the price per pastry and per dozen.", "line:7"),
    },
    3: {
        "see": ("Find Daniel's question about the table.", "line:2"),
        "recall": ("Without looking, say 'free, available' in French.", "word:8"),
        "hear": ("Listen for how Daniel describes the coffee and juice.", "line:8"),
        "type": ("Type 'Is the bread fresh today?' in French.", "word:12"),
        "say": ("Tell Rosa you are ready to order.", "word:14"),
        "write": ("Write Daniel's description of the chili sauce.", "line:9"),
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
        key = f"foundation:{number}"
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
