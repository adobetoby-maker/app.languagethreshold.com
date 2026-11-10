#!/usr/bin/env python3
"""Build source-pinned, private six-mode activities for French Breakfast Master 11–20."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-mode-activities-master-11-20.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    11: {
        "see": ("Find how long Mireille estimates the bread still needs.", "line:7"),
        "recall": ("Recall the French word for a thermos.", "word:3"),
        "hear": ("Listen for Sam's promise to handle the thermos.", "word:16"),
        "type": ("Type the question asking how much longer the bread needs.", "word:19"),
        "say": ("Ask Noor to prepare the packed lunches.", "word:20"),
        "write": ("Write what Sam confirms from the booking message.", "line:14"),
    },
    12: {
        "see": ("Find what form of address Madame Lavoie invites the guests to use.", "line:7"),
        "recall": ("Recall the French term for using vous.", "word:7"),
        "hear": ("Listen for the request for more coffee.", "word:17"),
        "type": ("Type the sentence explaining the switch to tu after an invitation.", "word:21"),
        "say": ("Ask the host for another apple juice politely.", "word:20"),
        "write": ("Write how Marcus first addresses the new guest.", "line:14"),
    },
    13: {
        "see": ("Find the hives Emma observed on Léa's arms.", "line:6"),
        "recall": ("Recall the French term for difficulty breathing.", "word:11"),
        "hear": ("Listen for Emma's exact statement about Léa eating cake at 8:10.", "word:16"),
        "type": ("Type Emma's statement that she did not see the preparation.", "word:21"),
        "say": ("Ask whether the manager wants the sequence repeated.", "word:23"),
        "write": ("Write the observed dizziness and breathing difficulty when responders arrived.", "line:12"),
    },
    14: {
        "see": ("Find Priya's direct statement about coeliac disease and the marked item.", "line:2"),
        "recall": ("Recall the French term for coeliac disease.", "word:1"),
        "hear": ("Listen for the statement that the label lists wheat flour.", "word:19"),
        "type": ("Type the question about ingredients and preparation.", "word:21"),
        "say": ("Ask the baker to pause sales while checking the item.", "word:22"),
        "write": ("Write what the baker does after checking the mismatched label.", "line:9"),
    },
    15: {
        "see": ("Find the staff member directing guests to the marked exit.", "line:2"),
        "recall": ("Recall the French term for a meeting point.", "word:6"),
        "hear": ("Listen for the request to repeat the meeting point.", "word:18"),
        "type": ("Type the message that the group is outside with two other guests.", "word:19"),
        "say": ("Tell reception that you are at the meeting point.", "word:21"),
        "write": ("Write what Daniel tells Fabiola about returning to the hotel.", "line:18"),
    },
    16: {
        "see": ("Find the two times Emma distinguishes in her notes.", "line:8"),
        "recall": ("Recall the French term for a written statement.", "word:3"),
        "hear": ("Listen for Emma's correction to the second section's time.", "word:17"),
        "type": ("Type the request to correct wording before approval.", "word:19"),
        "say": ("Ask for a copy of your statement.", "word:21"),
        "write": ("Write what Emma says she cannot confirm about the kitchen record.", "line:12"),
    },
    17: {
        "see": ("Find which detail Léa permits Emma to share in the email.", "line:4"),
        "recall": ("Recall the French term for consent.", "word:8"),
        "hear": ("Listen for Emma asking Léa about mentioning the responders.", "word:23"),
        "type": ("Type the sentence about not attaching medical information without agreement.", "word:24"),
        "say": ("Ask the hotel for a written reply about the records.", "word:21"),
        "write": ("Write what Emma asks the hotel to verify about the cake.", "line:11"),
    },
    18: {
        "see": ("Find what Claire must check before confirming a room for five.", "line:8"),
        "recall": ("Recall the French term for a broken phone connection.", "word:14"),
        "hear": ("Listen for the message explaining that the TER is delayed.", "word:16"),
        "type": ("Type the question about a later breakfast tomorrow.", "word:18"),
        "say": ("Ask how to collect the keys after a late arrival.", "word:21"),
        "write": ("Write which two requests are still pending with the host.", "line:17"),
    },
    19: {
        "see": ("Find the son's coeliac dietary need in Laura's checkout feedback.", "line:5"),
        "recall": ("Recall the French term for a coeliac dietary need.", "word:16"),
        "hear": ("Listen for Laura's request for clearer ingredient and preparation information.", "word:18"),
        "type": ("Type the sentence about considering a return if details are confirmed.", "word:19"),
        "say": ("Ask the children what they enjoyed at breakfast.", "word:24"),
        "write": ("Write the two parts of Laura's balanced feedback that Gabriel records.", "line:11"),
    },
    20: {
        "see": ("Find Rosa's serious peanut allergy in the breakfast scene.", "line:4"),
        "recall": ("Recall the French term for shared equipment.", "word:15"),
        "hear": ("Listen for the request for current ingredient information.", "word:17"),
        "type": ("Type the message that the group is twenty minutes late.", "word:22"),
        "say": ("Tell the server the group cannot choose without preparation details.", "word:20"),
        "write": ("Write what Rosa does for breakfast after declining café food.", "line:12"),
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
    for number, plan in PLAN.items():
        assert tuple(plan) == MODES
        key = f"master:{number}"
        lesson = lessons[key]
        for mode, (cue, short_ref) in plan.items():
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
    assert len(result["activities"]) == 60
    assert len({x["id"] for x in result["activities"]}) == 60
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private mode activities are stale"
        print("60 private activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
