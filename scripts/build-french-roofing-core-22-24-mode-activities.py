#!/usr/bin/env python3
"""Build private, source-linked French Roofing Core 22–24 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-core-22-24.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each cue targets a different task and is anchored to an exact French/English source pair.
PLAN = {
    22: {
        "see": ("Find what the worker notices about the lifeline.", "line:1"),
        "recall": ("Without looking, name the competent person in French.", "word:6"),
        "hear": ("Listen and identify the French word for lanyard.", "word:5"),
        "type": ("Type 'Where is the competent person?' in French.", "word:12"),
        "say": ("State that the anchor appears unsafe.", "line:3"),
        "write": ("Write what the competent person confirms in the scene.", "line:6"),
    },
    23: {
        "see": ("Find what makes the roof slippery in the morning.", "line:3"),
        "recall": ("Without looking, name lightning in French.", "word:3"),
        "hear": ("Listen and identify the French word for storm.", "word:8"),
        "type": ("Type 'A storm is coming. Come down now.' in French.", "word:14"),
        "say": ("Tell the crew that the roof is wet.", "line:2"),
        "write": ("Write what changes in the sky later in the scene.", "line:5"),
    },
    24: {
        "see": ("Find how Raúl answers the dizziness question.", "line:6"),
        "recall": ("Without looking, name heat exhaustion in French.", "word:6"),
        "hear": ("Listen and identify the French phrase for dizziness.", "word:12"),
        "type": ("Type 'How do you feel?' in French.", "word:11"),
        "say": ("Ask Raúl directly whether he is dizzy.", "line:5"),
        "write": ("Write what the foreman says about the site heat plan.", "line:8"),
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
        assert OUTPUT.read_text() == expected, "private Core 22–24 activities are stale"
        print("18 private Core 22–24 activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
