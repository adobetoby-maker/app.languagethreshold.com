#!/usr/bin/env python3
"""Build private, source-linked French Roofing Master 1–3 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-mode-activities-master-1-3.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

# Each cue targets a different task and is anchored to an exact French/English source pair.
PLAN = {
    1: {
        "see": ("Find which layer follows the roof deck in Rogelio's explanation.", "line:3"),
        "recall": ("Without looking, name the ice and water shield in French.", "word:7"),
        "hear": ("Listen and identify the ridge cap in French.", "word:11"),
        "type": ("Type 'Am I making sense?' in French.", "word:19"),
        "say": ("Check whether Kevin understands the explanation.", "line:14"),
        "write": ("Write Kevin's summary of the three main stages.", "line:15"),
    },
    2: {
        "see": ("Find what Rogelio uses to show the joint pattern.", "line:2"),
        "recall": ("Without looking, name the pattern in French.", "word:11"),
        "hear": ("Listen and identify the water path in French.", "word:8"),
        "type": ("Type 'May I explain why?' in French.", "word:20"),
        "say": ("Ask the homeowner whether you may explain the joint pattern.", "line:13"),
        "write": ("Write where moisture may reach before a leak appears.", "line:8"),
    },
    3: {
        "see": ("Find where the nailing zone appears on the shingle.", "line:3"),
        "recall": ("Without looking, name an overdriven nail in French.", "word:4"),
        "hear": ("Listen and identify the air pressure in French.", "word:7"),
        "type": ("Type 'Turn down the pressure.' in French.", "word:16"),
        "say": ("Invite Don Ernesto to check the local nailing approach.", "line:16"),
        "write": ("Write how the nail head should sit.", "line:9"),
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
        assert OUTPUT.read_text() == expected, "private Master 1–3 activities are stale"
        print("18 private Master 1–3 activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
