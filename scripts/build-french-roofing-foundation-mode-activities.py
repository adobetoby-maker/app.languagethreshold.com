#!/usr/bin/env python3
"""Build private, source-linked six-mode activities for Roofing Foundation 1–6."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-foundation-1-6.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each cue and its reference were selected for the lesson, rather than generated
# from the same vocabulary list for every mode. Say/Write remain open responses.
PLAN = {
    1: {
        "see": ("Find the request to speak more slowly in the dialogue.", "line:7"),
        "recall": ("Without looking, name the ladder in French.", "word:5"),
        "hear": ("Listen and identify the word for rope.", "word:8"),
        "type": ("Type 'Please repeat.' in French.", "word:12"),
        "say": ("Introduce yourself to the crew in French.", "line:1"),
        "write": ("Write a polite request to speak more slowly.", "line:7"),
    },
    2: {
        "see": ("Find how many bundles are needed in the dialogue.", "line:4"),
        "recall": ("Without looking, say 'How many bundles?' in French.", "word:9"),
        "hear": ("Listen for when the truck arrives.", "line:2"),
        "type": ("Type 'We start at six.' in French.", "word:12"),
        "say": ("Tell a colleague when work starts.", "line:1"),
        "write": ("Write the quantity of shingles needed today.", "line:4"),
    },
    3: {
        "see": ("Find how the roof is described today.", "line:2"),
        "recall": ("Without looking, say 'slippery' in French.", "word:5"),
        "hear": ("Listen and identify 'The roof is wet.'", "word:9"),
        "type": ("Type 'It's dangerous.' in French.", "word:10"),
        "say": ("Describe the roof to a colleague.", "line:2"),
        "write": ("Write a sentence describing the harness as ready.", "line:7"),
    },
    4: {
        "see": ("Find what is missing from the jobsite.", "line:2"),
        "recall": ("Without looking, say 'I need more nails.' in French.", "word:10"),
        "hear": ("Listen and identify the sentence that says there is a problem.", "line:1"),
        "type": ("Type 'I am thirsty.' in French.", "word:11"),
        "say": ("Tell the crew lead what you have and what tool you need.", "line:4"),
        "write": ("Write where the materials and debris are.", "line:6"),
    },
    5: {
        "see": ("Find what the crew plans to do tomorrow.", "line:7"),
        "recall": ("Without looking, say 'I'm going to go up.' in French.", "word:9"),
        "hear": ("Listen and identify the word for tomorrow.", "word:2"),
        "type": ("Type 'Can you help me?' in French.", "word:10"),
        "say": ("Ask a colleague for help with the ladder.", "line:5"),
        "write": ("Write what happens after the roof work.", "line:6"),
    },
    6: {
        "see": ("Find what the coworker does while the speaker nails.", "line:4"),
        "recall": ("Without looking, say when the crew goes up.", "word:10"),
        "hear": ("Listen and identify the sentence about cleanup.", "line:7"),
        "type": ("Type 'We clean up at the end.' in French.", "word:12"),
        "say": ("Describe how often you work on roofs.", "line:1"),
        "write": ("Write when the crew arrives in the morning.", "line:2"),
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
    for number, mode_plan in PLAN.items():
        assert tuple(mode_plan) == MODES
        key = f"foundation:{number}"
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
    assert len(result["activities"]) == 36
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
