#!/usr/bin/env python3
"""Build source-pinned, private six-mode activities for French Breakfast Core 22–30."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-mode-activities-core-22-30.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    22: {
        "see": ("Find this café's order of payment and counter service.", "line:2"),
        "recall": ("Recall the French term for the register.", "word:6"),
        "hear": ("Listen for the question about paying first at the register.", "word:11"),
        "type": ("Type the question about sugar already being in the coffee.", "word:12"),
        "say": ("Ask if you may stay at the table for a while.", "word:13"),
        "write": ("Write this barista's answer about ordering another coffee later.", "line:9"),
    },
    23: {
        "see": ("Find the receptionist's walking directions from the map.", "line:7"),
        "recall": ("Recall the French term for a traffic light.", "word:8"),
        "hear": ("Listen for the question about a bakery open before seven.", "word:13"),
        "type": ("Type the question asking how to get there on foot.", "word:14"),
        "say": ("Ask the receptionist to recommend a nearby bakery.", "word:11"),
        "write": ("Write the final description of the bakery's location.", "line:9"),
    },
    24: {
        "see": ("Find the manager's exact street-corner location for the operator.", "line:5"),
        "recall": ("Recall the French word for an ambulance.", "word:2"),
        "hear": ("Listen for the direct call for help in an emergency.", "word:13"),
        "type": ("Type the statement that a man fell at the next table.", "word:15"),
        "say": ("Ask the manager to call an ambulance.", "word:14"),
        "write": ("Write the witness's exact uncertainty about the man's breathing.", "line:8"),
    },
    25: {
        "see": ("Find where the hot coffee lands after the server trips.", "line:1"),
        "recall": ("Recall the French word for a burn.", "word:4"),
        "hear": ("Listen for Ana's request for cold water.", "word:12"),
        "type": ("Type the question asking for a first-aid kit.", "word:13"),
        "say": ("Ask for more napkins after the spill.", "word:14"),
        "write": ("Write Ana's statement about the small burn.", "line:6"),
    },
    26: {
        "see": ("Find which table the server offers and what is beside it.", "line:5"),
        "recall": ("Recall the French word for an outlet.", "word:5"),
        "hear": ("Listen for Lena's request to work for two hours.", "word:13"),
        "type": ("Type the question about the Wi-Fi password.", "word:14"),
        "say": ("Ask when the server would prefer another order.", "word:16"),
        "write": ("Write what Lena says she will do if the café fills up.", "line:4"),
    },
    27: {
        "see": ("Find what time the packed breakfast will be ready.", "line:7"),
        "recall": ("Recall the French term for an airport transfer.", "word:3"),
        "hear": ("Listen for Ana's early airport-transfer departure time.", "word:13"),
        "type": ("Type the question about where to pick up breakfast.", "word:15"),
        "say": ("Ask the hotel to prepare a packed breakfast.", "word:12"),
        "write": ("Write Ana's statement about her nut allergy and the room number note.", "line:5"),
    },
    28: {
        "see": ("Find how long Madame Martin has lived in the neighborhood.", "line:4"),
        "recall": ("Recall the French word for a neighborhood.", "word:3"),
        "hear": ("Listen for the question about how long she has lived here.", "word:14"),
        "type": ("Type the request to hear more about her former work.", "word:16"),
        "say": ("Ask Madame Martin what she recommends visiting nearby.", "word:17"),
        "write": ("Write the traveler's polite closing after the conversation.", "line:8"),
    },
    29: {
        "see": ("Find Camille's answer about local tipping habits.", "line:6"),
        "recall": ("Recall the French word for change after paying.", "word:8"),
        "hear": ("Listen for the offer to pay for breakfast today.", "word:11"),
        "type": ("Type the proposal to leave the tip.", "word:14"),
        "say": ("Ask whether leaving a tip is customary here.", "word:15"),
        "write": ("Write what the traveler says about paying next time.", "line:8"),
    },
    30: {
        "see": ("Find the family's exact nut-allergy statement before ordering.", "line:3"),
        "recall": ("Recall the French word for an allergy.", "word:1"),
        "hear": ("Listen for the direct statement that the daughter is allergic to nuts.", "word:14"),
        "type": ("Type the request for a high chair.", "word:12"),
        "say": ("Tell the cashier there is a mistake on the bill.", "word:15"),
        "write": ("Write what the family does when the kitchen cannot rule out cross-contact.", "line:4"),
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
        key = f"core:{number}"
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
    assert len(result["activities"]) == 54
    assert len({x["id"] for x in result["activities"]}) == 54
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private mode activities are stale"
        print("54 private activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
