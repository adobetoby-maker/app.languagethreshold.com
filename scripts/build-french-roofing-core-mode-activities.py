#!/usr/bin/env python3
"""Build private, source-linked Core 1–12 French Roofing activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-core-1-12.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# The cue and source reference for each activity are authored for its lesson.
PLAN = {
    1: {
        "see": ("Find whether this roof is flat or sloped.", "line:3"),
        "recall": ("Without looking, name the roof system in French.", "word:6"),
        "hear": ("Listen and identify the word for skylight.", "word:10"),
        "type": ("Type 'Is the roof flat or sloped?' in French.", "word:14"),
        "say": ("Ask the crew what material covers this roof.", "line:5"),
        "write": ("Write where the skylight is located.", "line:7"),
    },
    2: {
        "see": ("Find what the roof deck is made of.", "line:2"),
        "recall": ("Without looking, name the underlayment in French.", "word:2"),
        "hear": ("Listen and identify the term for drip edge.", "word:4"),
        "type": ("Type 'Roll out the underlayment.' in French.", "word:13"),
        "say": ("Ask where the drip edge goes.", "line:5"),
        "write": ("Write which layer goes on top of the deck.", "line:4"),
    },
    3: {
        "see": ("Find where the step flashing is placed in this scene.", "line:4"),
        "recall": ("Without looking, name the roof valley in French.", "word:3"),
        "hear": ("Listen and identify the word for leak.", "word:7"),
        "type": ("Type 'Show me where the flashing goes.' in French.", "word:12"),
        "say": ("Ask where the valleys are on this roof.", "line:5"),
        "write": ("Write what the flashing helps prevent.", "line:3"),
    },
    4: {
        "see": ("Find where the ridge vent runs.", "line:2"),
        "recall": ("Without looking, name the downspout in French.", "word:4"),
        "hear": ("Listen and identify the term for ridge vent.", "word:7"),
        "type": ("Type 'Where does the downspout go?' in French.", "word:12"),
        "say": ("Ask a coworker where the downspout goes.", "word:12"),
        "write": ("Write where the water has to run.", "line:6"),
    },
    5: {
        "see": ("Find how the foreman checks which nails this job requires.", "line:4"),
        "recall": ("Without looking, name roofing nails in French.", "word:1"),
        "hear": ("Listen and identify plastic cap nails.", "word:2"),
        "type": ("Type 'Please confirm the order.' in French.", "word:14"),
        "say": ("Ask the supplier when the materials can be delivered.", "word:13"),
        "write": ("Write which two additional products the foreman needs.", "line:5"),
    },
    6: {
        "see": ("Find how the crew's tasks are organized.", "line:5"),
        "recall": ("Without looking, name an assigned task in French.", "word:7"),
        "hear": ("Listen and identify the word for hazard.", "word:9"),
        "type": ("Type 'Does everyone understand the plan?' in French.", "word:15"),
        "say": ("Invite questions before the crew begins.", "word:16"),
        "write": ("Write what a worker should report if they notice it.", "line:7"),
    },
    7: {
        "see": ("Find which layers the crew is told to remove.", "line:4"),
        "recall": ("Without looking, name the scope of work in French.", "word:6"),
        "hear": ("Listen and identify the word for pry bar.", "word:8"),
        "type": ("Type 'Tear off everything down to the deck.' in French.", "word:10"),
        "say": ("Ask the crew to confirm what must be removed.", "word:14"),
        "write": ("Write what the crew is told to do with the flashing.", "line:5"),
    },
    8: {
        "see": ("Find what the worker discovers underfoot.", "line:4"),
        "recall": ("Without looking, name roof sheathing in French.", "word:1"),
        "hear": ("Listen and identify the word for damage.", "word:3"),
        "type": ("Type 'Do not cover the soft panel.' in French.", "word:13"),
        "say": ("Tell the foreman if the deck feels soft or damaged.", "word:11"),
        "write": ("Write what the foreman says about the repair.", "line:5"),
    },
    9: {
        "see": ("Find which two tools the workers use for debris.", "line:4"),
        "recall": ("Without looking, name old nails in French.", "word:2"),
        "hear": ("Listen and identify the word for magnet.", "word:5"),
        "type": ("Type 'Tell me when the magnetic nail sweep is finished.' in French.", "word:13"),
        "say": ("Tell a coworker to put on their gloves.", "word:15"),
        "write": ("Write where the magnet is used after the nails are pulled.", "line:6"),
    },
    10: {
        "see": ("Find which part of the roof is unfinished.", "line:3"),
        "recall": ("Without looking, name an unfinished section in French.", "word:2"),
        "hear": ("Listen and identify the word for tarp.", "word:1"),
        "type": ("Type 'Cover this section before we leave.' in French.", "word:11"),
        "say": ("Ask the crew to repeat the closing plan.", "word:14"),
        "write": ("Write how the tarp is secured in the scene.", "line:7"),
    },
    11: {
        "see": ("Find where the foreman marks measurement points.", "line:2"),
        "recall": ("Without looking, name the starter strip in French.", "word:3"),
        "hear": ("Listen and identify the term for chalk line.", "word:1"),
        "type": ("Type 'Is the line straight?' in French.", "word:11"),
        "say": ("Tell a coworker to run the chalk line for the first course.", "word:9"),
        "write": ("Write where the overhang measurement is recorded.", "line:9"),
    },
    12: {
        "see": ("Find how the joints should relate to one another.", "line:3"),
        "recall": ("Without looking, name the stagger in French.", "word:2"),
        "hear": ("Listen and identify the word for specification.", "word:8"),
        "type": ("Type 'What is the stagger for this job?' in French.", "word:12"),
        "say": ("Ask the office to confirm the job specification.", "word:13"),
        "write": ("Write how the worker asks about this job's stagger.", "line:6"),
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
    assert len(result["activities"]) == 72
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private Core mode activities are stale"
        print("72 private Core activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
