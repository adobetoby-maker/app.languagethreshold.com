#!/usr/bin/env python3
"""Build source-pinned, private six-mode activities for French Breakfast F4–10."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-mode-activities-foundation-4-10.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    4: {
        "see": ("Find which two spreads come with the toast.", "line:5"),
        "recall": ("Recall the French word for a napkin.", "word:7"),
        "hear": ("Listen for Emma's question about fresh orange juice.", "word:10"),
        "type": ("Type Emma's request for tea without sugar in French.", "word:13"),
        "say": ("Ask the server for a napkin, please.", "word:12"),
        "write": ("Write how Emma asks whether there is toast.", "word:11"),
    },
    5: {
        "see": ("Find where Emma plans to sit.", "line:5"),
        "recall": ("Recall the French word for a bakery.", "word:1"),
        "hear": ("Listen for Emma's choice to eat here, rather than take food away.", "line:4"),
        "type": ("Type Emma's plan to order an omelette in French.", "word:11"),
        "say": ("Ask whether you can pay by card.", "word:14"),
        "write": ("Write what Emma plans to do at the bakery afterward.", "line:9"),
    },
    6: {
        "see": ("Find what Lucie eats with scrambled eggs.", "line:4"),
        "recall": ("Recall the French term for fruit salad.", "word:8"),
        "hear": ("Listen for Emma's everyday breakfast time.", "word:11"),
        "type": ("Type the question about coffee or tea in French.", "word:12"),
        "say": ("Ask Lucie whether she lives here.", "word:13"),
        "write": ("Write what Lucie says her family eats at home.", "line:8"),
    },
    7: {
        "see": ("Find when the included breakfast ends.", "line:6"),
        "recall": ("Recall the French question word for 'where?'.", "word:3"),
        "hear": ("Listen for Tom's question about the house coffee.", "word:15"),
        "type": ("Type the question about the pastry's name in French.", "word:14"),
        "say": ("Ask where the restroom is.", "word:12"),
        "write": ("Write Rosa's answer naming the pastry and restroom location.", "line:9"),
    },
    8: {
        "see": ("Find Tom's exact statement about peanuts and his allergy.", "line:5"),
        "recall": ("Recall the French term for a peanut.", "word:3"),
        "hear": ("Listen for Tom saying he never eats peanuts because he is allergic.", "word:13"),
        "type": ("Type Emma's statement that she does not eat meat in French.", "word:12"),
        "say": ("Tell the server that you are not ready yet.", "word:14"),
        "write": ("Write what Luis says he cannot confirm about the dish.", "line:7"),
    },
    9: {
        "see": ("Find how Anna pays for the eighteen-euro bill.", "line:8"),
        "recall": ("Recall the French word for the bill.", "word:1"),
        "hear": ("Listen for Anna asking for the bill.", "word:10"),
        "type": ("Type Anna's request for more cream in French.", "word:12"),
        "say": ("Ask the server for a glass of water.", "word:11"),
        "write": ("Write what Anna says about the two euros in change.", "line:9"),
    },
    10: {
        "see": ("Find what Rosa says she can check about the quiche ingredients.", "line:7"),
        "recall": ("Recall the French term for an emergency.", "word:9"),
        "hear": ("Listen for Emma asking the server to speak more slowly.", "word:11"),
        "type": ("Type the question about the ingredients in French.", "word:13"),
        "say": ("Ask whether there is a vegetarian option.", "word:14"),
        "write": ("Write 'Help, it's an emergency!' in French.", "word:15"),
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
        key = f"foundation:{number}"
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
    assert len(result["activities"]) == 42
    assert len({x["id"] for x in result["activities"]}) == 42
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private mode activities are stale"
        print("42 private activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
