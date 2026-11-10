#!/usr/bin/env python3
"""Build private, source-linked French Roofing Master 10–12 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-master-10-12.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each cue targets a different task and is anchored to an exact French/English source pair.
PLAN = {
    10: {
        "see": ("Find what the witness says happened at the end of the day.", "line:9"),
        "recall": ("Without looking, name a misunderstanding in French.", "word:3"),
        "hear": ("Listen and identify the French term for tie-down.", "word:13"),
        "type": ("Type 'One at a time, please.' in French.", "word:17"),
        "say": ("Ask Marcos to tell his side of the story.", "line:5"),
        "write": ("Write the new tarp-check assignment before the crew leaves.", "line:14"),
    },
    11: {
        "see": ("Find the water and electrolytes planned for the crew.", "line:7"),
        "recall": ("Without looking, name heat exhaustion in French.", "word:2"),
        "hear": ("Listen and identify the French term for heatstroke.", "word:3"),
        "type": ("Type 'If you get dizzy, tell me right away.' in French.", "word:19"),
        "say": ("Explain the planned shaded breaks to the crew.", "line:8"),
        "write": ("Write what Rogelio says about Friday's deadline.", "line:13"),
    },
    12: {
        "see": ("Find how Rogelio would speak to a colleague who accepts informal address.", "line:4"),
        "recall": ("Without looking, name the degree of formality in French.", "word:10"),
        "hear": ("Listen and identify the French term for courtesy.", "word:5"),
        "type": ("Type 'Would you allow me to show you the area?' in French.", "word:18"),
        "say": ("Ask an older coworker which form of address they prefer.", "line:14"),
        "write": ("Write the polite opening Rogelio suggests for the homeowner.", "line:6"),
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
        assert OUTPUT.read_text() == expected, "private Master 10–12 activities are stale"
        print("18 private Master 10–12 activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
