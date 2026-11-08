#!/usr/bin/env python3
"""Build private, source-linked French Roofing Master 13–15 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-master-13-15.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each cue targets a different task and is anchored to an exact French/English source pair.
PLAN = {
    13: {
        "see": ("Find the approximate time and place of Julio's fall.", "line:1"),
        "recall": ("Without looking, name the incident report in French.", "word:2"),
        "hear": ("Listen and identify the French term for ankle.", "word:11"),
        "type": ("Type 'What time exactly did it happen?' in French.", "word:20"),
        "say": ("Tell the supervisor an accident occurred.", "word:21"),
        "write": ("Write the time range Rogelio gives the supervisor.", "line:12"),
    },
    14: {
        "see": ("Find where the bundle landed relative to the pedestrian.", "line:2"),
        "recall": ("Without looking, name the near-miss in French.", "word:1"),
        "hear": ("Listen and identify the French term for sidewalk.", "word:8"),
        "type": ("Type 'What can we change so it doesn't happen again?' in French.", "word:19"),
        "say": ("Ask the pedestrian whether he is all right.", "line:5"),
        "write": ("Write what Kevin says about the stack of bundles.", "line:12"),
    },
    15: {
        "see": ("Find what Rogelio sees on the radar at half past one.", "line:1"),
        "recall": ("Without looking, name the storm cell in French.", "word:2"),
        "hear": ("Listen and identify the French term for gust.", "word:6"),
        "type": ("Type 'Do you copy?' in French.", "word:20"),
        "say": ("Answer the radio call and say you are heading down.", "line:13"),
        "write": ("Write what Rogelio tells the homeowner from a safe place.", "line:16"),
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
        key = f"master:{number}"
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
        assert OUTPUT.read_text() == expected, "private Master 13–15 activities are stale"
        print("18 private Master 13–15 activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
