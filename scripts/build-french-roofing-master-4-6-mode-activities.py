#!/usr/bin/env python3
"""Build private, source-linked French Roofing Master 4–6 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-master-4-6.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each cue targets a different task and is anchored to an exact French/English source pair.
PLAN = {
    4: {
        "see": ("Find what Rogelio reads aloud from the manufacturer instructions.", "line:4"),
        "recall": ("Without looking, name the spec sheet in French.", "word:1"),
        "hear": ("Listen and identify the term for minimum overlap.", "word:7"),
        "type": ("Type 'Don't do it from memory.' in French.", "word:18"),
        "say": ("Ask what the sheet says about the overlap.", "line:13"),
        "write": ("Write which other roof features Kevin says have their own section.", "line:14"),
    },
    5: {
        "see": ("Find what Rogelio records before speaking with the homeowner.", "line:5"),
        "recall": ("Without looking, name the change order in French.", "word:3"),
        "hear": ("Listen and identify the phrase for extra cost.", "word:5"),
        "type": ("Type 'Shall I show you the photos?' in French.", "word:19"),
        "say": ("Tell Mr. Ramírez what the crew found beneath the shingles.", "line:7"),
        "write": ("Write what Rogelio says about the written extra cost.", "line:13"),
    },
    6: {
        "see": ("Find when the supplier says the factory shipment may reach the warehouse.", "line:4"),
        "recall": ("Without looking, name the substitute in French.", "word:4"),
        "hear": ("Listen and identify the French term for invoice.", "word:13"),
        "type": ("Type 'When will the rest arrive?' in French.", "word:16"),
        "say": ("Ask Kevin for help with the rolls.", "line:17"),
        "write": ("Write what Rogelio asks the supplier to send before deciding.", "line:9"),
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
        assert OUTPUT.read_text() == expected, "private Master 4–6 activities are stale"
        print("18 private Master 4–6 activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
