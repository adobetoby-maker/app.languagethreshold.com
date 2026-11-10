#!/usr/bin/env python3
"""Build private, source-linked French Roofing Core 25–27 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-core-25-27.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each cue targets a different task and is anchored to an exact French/English source pair.
PLAN = {
    25: {
        "see": ("Find where the warning tape goes.", "line:3"),
        "recall": ("Without looking, name the exclusion area in French.", "word:3"),
        "hear": ("Listen and identify the word for debris chute.", "word:7"),
        "type": ("Type 'Do not stand under the work.' in French.", "word:12"),
        "say": ("Warn the ground crew that debris is coming down.", "word:15"),
        "write": ("Write when the ground crew may return.", "line:8"),
    },
    26: {
        "see": ("Find what the workers replace in the damaged section.", "line:4"),
        "recall": ("Without looking, name the repair photo in French.", "word:1"),
        "hear": ("Listen and identify the French word for sheathing.", "word:8"),
        "type": ("Type 'Show me the damaged area.' in French.", "word:11"),
        "say": ("Ask how large the repaired section is.", "line:5"),
        "write": ("Write what is photographed before it is covered.", "line:7"),
    },
    27: {
        "see": ("Find what the foreman checks around the vent.", "line:4"),
        "recall": ("Without looking, name the pipe boot in French.", "word:2"),
        "hear": ("Listen and identify the French word for penetration.", "word:4"),
        "type": ("Type 'Is the pipe boot cracked?' in French.", "word:13"),
        "say": ("Ask the crew lead what has already been checked.", "line:3"),
        "write": ("Write what is photographed at each penetration.", "line:7"),
    },
}


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert source["releaseGate"]["enabled"] is False
    lessons = {lesson["draftLessonKey"]: lesson for lesson in source["lessons"]}
    result = {
        "schema": 1,
        "purpose": "private authored activity pilot; not learner-facing",
        "sourceFixture": str(SOURCE.relative_to(ROOT)),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "targetLanguage": "French",
        "nativeLanguage": "English",
        "reviewed": False,
        "registered": False,
        "audioListeningReviewed": False,
        "activities": [],
    }
    for number, mode_plan in PLAN.items():
        assert tuple(mode_plan) == MODES
        key = f"core:{number}"
        lesson = lessons[key]
        for mode, (cue, short_ref) in mode_plan.items():
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
    assert len({item["id"] for item in result["activities"]}) == 18
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private Core 25–27 activities are stale"
        print("18 private Core 25–27 activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
