#!/usr/bin/env python3
"""Build private, source-linked French Roofing Master 7–9 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-master-7-9.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each cue targets a different task and is anchored to an exact French/English source pair.
PLAN = {
    7: {
        "see": ("Find where the crew marked a 10-by-10-foot test square.", "line:5"),
        "recall": ("Without looking, name the adjuster in French.", "word:1"),
        "hear": ("Listen and identify the French term for the roof slope.", "word:11"),
        "type": ("Type 'Mark each hit with chalk.' in French.", "word:18"),
        "say": ("Ask the adjuster to repeat the measurements more slowly.", "line:12"),
        "write": ("Write what the adjuster says will happen to the west and north sides.", "line:14"),
    },
    8: {
        "see": ("Find the homeowner's request about the underlayment.", "line:4"),
        "recall": ("Without looking, name the manufacturer warranty in French.", "word:11"),
        "hear": ("Listen and identify the French term for thunder.", "word:2"),
        "type": ("Type 'Don't go up until I say so.' in French.", "word:20"),
        "say": ("Tell Mrs. Flores why Rogelio cannot omit the planned underlayment.", "line:9"),
        "write": ("Write the condition Rogelio puts on temporary tarping.", "line:11"),
    },
    9: {
        "see": ("Find what Julio says caused the uneven course.", "line:7"),
        "recall": ("Without looking, name the exposure in French.", "word:2"),
        "hear": ("Listen and identify the French term for alignment.", "word:11"),
        "type": ("Type 'What happened here, in your view?' in French.", "word:17"),
        "say": ("Ask Julio to look at the course with you in private.", "line:4"),
        "write": ("Write what Julio agrees to remove and reinstall.", "line:12"),
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
        assert OUTPUT.read_text() == expected, "private Master 7–9 activities are stale"
        print("18 private Master 7–9 activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
