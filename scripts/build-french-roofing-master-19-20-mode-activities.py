#!/usr/bin/env python3
"""Build private, source-linked French Roofing Master 19–20 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-master-19-20.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each cue targets a different task and is anchored to an exact French/English source pair.
PLAN = {
    19: {
        "see": ("Find what the final invoice describes.", "line:4"),
        "recall": ("Without looking, name the installation warranty in French.", "word:4"),
        "hear": ("Listen and identify the French term for exclusion.", "word:8"),
        "type": ("Type 'Do you have any questions before signing?' in French.", "word:21"),
        "say": ("Invite the Novaks to examine the accessible attic together.", "line:12"),
        "write": ("Write what Rogelio says about the product-warranty registration.", "line:11"),
    },
    20: {
        "see": ("Find the morning plan Rogelio gives the crew.", "line:3"),
        "recall": ("Without looking, name the adjuster's report in French.", "word:7"),
        "hear": ("Listen and identify the French term for follow-up.", "word:13"),
        "type": ("Type 'Safety first, then speed.' in French.", "word:15"),
        "say": ("Ask the owner whether you may explain what was found.", "line:7"),
        "write": ("Write what the end-of-day report distinguishes.", "line:15"),
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
    assert len(result["activities"]) == 12
    assert len({item["id"] for item in result["activities"]}) == 12
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private Master 19–20 activities are stale"
        print("12 private Master 19–20 activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
