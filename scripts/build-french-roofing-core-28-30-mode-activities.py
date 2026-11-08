#!/usr/bin/env python3
"""Build private, source-linked French Roofing Core 28–30 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-core-28-30.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each cue targets a different task and is anchored to an exact French/English source pair.
PLAN = {
    28: {
        "see": ("Find why the downspout might be blocked.", "line:4"),
        "recall": ("Without looking, name the dumpster in French.", "word:2"),
        "hear": ("Listen and identify the French word for gutter.", "word:1"),
        "type": ("Type 'Is the dumpster full?' in French.", "word:15"),
        "say": ("Ask when the magnetic nail sweep is finished.", "word:12"),
        "write": ("Write what the crew does with the trash.", "line:8"),
    },
    29: {
        "see": ("Find which section remains unfinished.", "line:4"),
        "recall": ("Without looking, name the punch list in French.", "word:1"),
        "hear": ("Listen and identify the phrase for remaining materials.", "word:6"),
        "type": ("Type 'This is still open.' in French.", "word:13"),
        "say": ("Ask which areas are still open for tomorrow.", "line:3"),
        "write": ("Write tomorrow's first task.", "line:7"),
    },
    30: {
        "see": ("Find the order of tear-off and installation.", "line:4"),
        "recall": ("Without looking, name the crew lead in French.", "word:6"),
        "hear": ("Listen and identify the French word for flashing.", "word:8"),
        "type": ("Type 'Let's review today's roof plan before we start.' in French.", "word:11"),
        "say": ("Invite a coworker to walk the roof before calling the job complete.", "word:14"),
        "write": ("Write what remains on the closeout punch list.", "line:9"),
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
        assert OUTPUT.read_text() == expected, "private Core 28–30 activities are stale"
        print("18 private Core 28–30 activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
