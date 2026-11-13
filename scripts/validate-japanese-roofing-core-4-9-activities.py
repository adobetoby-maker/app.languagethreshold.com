#!/usr/bin/env python3
"""Build and verify private source-linked Japanese Roofing Core 4–9 activities."""

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODES = ("see", "recall", "hear", "type", "say", "write")
GROUPS = {
    "4-6": "content/japanese-roofing/core-4-6-draft.json",
    "7-9": "content/japanese-roofing/core-7-9-draft.json",
}
SPEC = {
    4: (
        ("reader", 4, "Find the fascia and soffit at the roof edge."),
        ("cards", 7, "Recall the Japanese term for ridge vent."),
        ("cards", 4, "Listen for the Japanese term for downspout."),
        ("cards", 13, "Type the Japanese sentence 'The gutter is clogged.'"),
        ("cards", 12, "Ask where the downspout goes."),
        ("reader", 6, "Write that water must run away from the house."),
    ),
    5: (
        ("reader", 4, "Find why the foreman reads the job specifications."),
        ("cards", 7, "Recall the Japanese term for galvanized nails."),
        ("cards", 2, "Listen for the Japanese term for plastic cap nails."),
        ("cards", 10, "Type the request for two boxes of roofing nails."),
        ("cards", 13, "Ask the supplier when the materials can be delivered."),
        ("reader", 8, "Write a request to confirm the order."),
    ),
    6: (
        ("reader", 4, "Find who volunteers to lead the tear-off crew."),
        ("cards", 2, "Recall the Japanese term for the material staging area."),
        ("cards", 9, "Listen for the Japanese word for hazard."),
        ("cards", 15, "Type the question asking whether everyone understands the plan."),
        ("cards", 13, "Ask a worker to show where the materials will be staged."),
        ("reader", 5, "Write that each person has an assignment in a work zone."),
    ),
    7: (
        ("reader", 4, "Find which layers the crew must remove."),
        ("cards", 8, "Recall the Japanese term for pry bar."),
        ("cards", 7, "Listen for the Japanese term for underlayment."),
        ("cards", 10, "Type the instruction to remove everything down to the deck."),
        ("cards", 14, "Ask whether the worker understands what must be removed."),
        ("reader", 5, "Write the instruction to remove the flashing too."),
    ),
    8: (
        ("reader", 4, "Find what the worker notices about the panel and wood."),
        ("cards", 1, "Recall the Japanese term for sheathing."),
        ("cards", 4, "Listen for the Japanese term for rotten wood."),
        ("cards", 14, "Type the instruction to mark the damaged area."),
        ("cards", 11, "Tell the foreman if the deck feels soft or damaged."),
        ("reader", 8, "Write that this plywood needs to be replaced."),
    ),
    9: (
        ("reader", 4, "Find which tools the two workers use."),
        ("cards", 5, "Recall the Japanese word for magnet."),
        ("cards", 1, "Listen for the Japanese term for the debris dumpster."),
        ("cards", 11, "Type the instruction to pull all the old nails."),
        ("cards", 13, "Ask someone to tell you when the magnetic nail sweep is done."),
        ("reader", 7, "Write the instruction to sweep the deck before underlayment."),
    ),
}


def build(group, source_path):
    raw = (ROOT / source_path).read_bytes()
    source = json.loads(raw)
    assert source["target"] == "Japanese" and source["native"] == "English"
    assert source["reviewed"] is False and source["registered"] is False
    start, end = map(int, group.split("-"))
    assert {lesson["n"] for lesson in source["lessons"]} == set(range(start, end + 1))
    activities = []
    for lesson in source["lessons"]:
        lesson_id = lesson["stableId"]
        assert len(SPEC[lesson["n"]]) == len(MODES)
        for mode, (collection, index, cue) in zip(MODES, SPEC[lesson["n"]]):
            pair = lesson[collection][index - 1]
            assert pair["ja"] and pair["en"] and cue
            activities.append({
                "id": f"{lesson_id}:{mode}:private-1",
                "lessonId": lesson_id,
                "mode": mode,
                "cueEnglish": cue,
                "sourceRef": f"{lesson_id}:{collection}:{index}",
                "modelJapanese": pair["ja"],
                "modelEnglish": pair["en"],
                "responseKind": "open" if mode in ("say", "write") else "fixed",
                "recordedAudioRequired": mode == "hear",
                "readyForLearner": False,
            })
    assert len(activities) == (end - start + 1) * 6
    assert len({a["id"] for a in activities}) == len(activities)
    return {
        "schema": 1,
        "state": "private-authored-activity-draft",
        "pairKey": "Japanese:English",
        "source": source_path,
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "reviewed": False,
        "registered": False,
        "audioListeningReviewed": False,
        "activities": activities,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    total = 0
    for group, source_path in GROUPS.items():
        expected = build(group, source_path)
        path = ROOT / f"content/japanese-roofing/private-mode-activities-core-{group}.json"
        if args.write:
            path.write_text(json.dumps(expected, ensure_ascii=False, indent=2) + "\n")
        assert json.loads(path.read_text()) == expected, f"Core {group} activity source changed"
        total += len(expected["activities"])
    print(f"Japanese Roofing Core 4–9: {total} exact-pair activities verified; private and disabled")


if __name__ == "__main__":
    main()
