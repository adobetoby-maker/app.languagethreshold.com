#!/usr/bin/env python3
"""Build private, source-linked French Roofing Master 16–18 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-master-16-18.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each cue targets a different task and is anchored to an exact French/English source pair.
PLAN = {
    16: {
        "see": ("Find the inspector's observation about the garage wall.", "line:11"),
        "recall": ("Without looking, name the re-inspection in French.", "word:8"),
        "hear": ("Listen and identify the French term for building permit.", "word:2"),
        "type": ("Type 'Could you tell me what needs to be corrected?' in French.", "word:19"),
        "say": ("Show the inspector the permit and greet him.", "line:2"),
        "write": ("Write what Rogelio says about arranging a correction and re-inspection.", "line:14"),
    },
    17: {
        "see": ("Find what the report says was completed on the east side.", "line:6"),
        "recall": ("Without looking, name the daily report in French.", "word:1"),
        "hear": ("Listen and identify the French term for deck repair.", "word:6"),
        "type": ("Type 'Before and after photos are attached.' in French.", "word:19"),
        "say": ("Ask Kevin to send the plywood photos.", "line:2"),
        "write": ("Write the open items from the report.", "line:12"),
    },
    18: {
        "see": ("Find why the crew cannot start at Mrs. Kim's house tomorrow.", "line:4"),
        "recall": ("Without looking, name the voicemail in French.", "word:3"),
        "hear": ("Listen and identify the French term for rain delay.", "word:5"),
        "type": ("Type 'Would it be possible to start on Thursday?' in French.", "word:16"),
        "say": ("Ask Mr. Kim whether Friday works for him.", "line:10"),
        "write": ("Write the Friday arrival time proposed in the final text.", "line:15"),
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
        assert OUTPUT.read_text() == expected, "private Master 16–18 activities are stale"
        print("18 private Master 16–18 activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
