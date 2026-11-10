#!/usr/bin/env python3
"""Build and verify private Japanese Roofing Core 19–30 activities."""

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODES = ("see", "recall", "hear", "type", "say", "write")
GROUPS = {
    "19-20": "content/japanese-roofing/core-19-20-draft.json",
    "21-23": "content/japanese-roofing/core-21-23-draft.json",
    "24-26": "content/japanese-roofing/core-24-26-draft.json",
    "27-30": "content/japanese-roofing/core-27-30-draft.json",
}
SPEC = {
    19: (
        ("reader", 4, "Find how the installers describe placement of step flashing."),
        ("cards", 1, "Recall the Japanese term for step flashing."),
        ("cards", 9, "Listen for the Japanese term for overlap."),
        ("cards", 11, "Type the instruction to install one piece per course."),
        ("cards", 13, "Ask the installers to describe the sidewall flashing sequence."),
        ("reader", 8, "Write when the foreman checks each flashing piece."),
    ),
    20: (
        ("reader", 4, "Find the product condition on cutting ridge caps from a starter shingle."),
        ("cards", 4, "Recall the Japanese term for a roof hip."),
        ("cards", 1, "Listen for the Japanese term for ridge cap."),
        ("cards", 12, "Type the instruction to check ridge-cap product directions."),
        ("cards", 11, "Tell a worker to install the ridge caps along the ridge."),
        ("reader", 8, "Write the instruction to clean the roof after finishing."),
    ),
    21: (
        ("reader", 6, "Find what a worker tells the foreman if no roof anchor is visible."),
        ("cards", 2, "Recall the Japanese term for fall-protection tie-off."),
        ("cards", 3, "Listen for the Japanese term for roof anchor."),
        ("cards", 14, "Type the instruction that nobody goes up without a harness."),
        ("cards", 12, "Ask to see the approved anchor."),
        ("reader", 7, "Write the instruction to put on a hard hat too."),
    ),
    22: (
        ("reader", 1, "Find what the worker notices about the lifeline."),
        ("cards", 6, "Recall the Japanese term for competent person."),
        ("cards", 2, "Listen for the Japanese term for lifeline."),
        ("cards", 13, "Type the instruction to check the lifeline for damage."),
        ("cards", 12, "Ask where the competent person is."),
        ("reader", 7, "Write the instruction to confirm anchor setup before continuing."),
    ),
    23: (
        ("reader", 5, "Find what changes in the weather later."),
        ("cards", 2, "Recall the Japanese term for footing."),
        ("cards", 3, "Listen for the Japanese word for lightning."),
        ("cards", 14, "Type the instruction to come down because a storm is approaching."),
        ("cards", 13, "Tell a coworker the roof is wet."),
        ("reader", 6, "Write the instruction about working on the roof during lightning."),
    ),
    24: (
        ("reader", 6, "Find Raúl's answer to the dizziness question."),
        ("cards", 6, "Recall the Japanese clinical term for heat exhaustion."),
        ("cards", 5, "Listen for the Japanese expression meaning dizzy."),
        ("cards", 12, "Type the Japanese question 'Are you dizzy?'"),
        ("cards", 11, "Ask a coworker how they feel."),
        ("reader", 9, "Write the sentence about hydration, shade, and heat exhaustion."),
    ),
    25: (
        ("reader", 2, "Find whom falling debris can hurt."),
        ("cards", 3, "Recall the Japanese term for exclusion area."),
        ("cards", 7, "Listen for the Japanese term for debris chute."),
        ("cards", 15, "Type the warning that debris is coming down."),
        ("cards", 13, "Tell the crew to wait until you say it is clear."),
        ("reader", 3, "Write the instruction to put warning tape around the exclusion area."),
    ),
    26: (
        ("reader", 4, "Find what damaged material the workers replace."),
        ("cards", 1, "Recall the Japanese term for repair photo."),
        ("cards", 8, "Listen for the Japanese term for sheathing."),
        ("cards", 14, "Type the question asking how big the repaired section is."),
        ("cards", 11, "Ask a worker to show the damaged area."),
        ("reader", 9, "Write what the repair photo records."),
    ),
    27: (
        ("reader", 6, "Find what a crack near the pipe boot can cause."),
        ("cards", 4, "Recall the Japanese term for roof penetration."),
        ("cards", 2, "Listen for the Japanese term for pipe boot."),
        ("cards", 13, "Type the question asking whether the pipe boot is cracked."),
        ("cards", 14, "Ask which penetrations have already been checked."),
        ("reader", 7, "Write the instruction to photograph flashing around each penetration."),
    ),
    28: (
        ("reader", 4, "Find what a full gutter can block."),
        ("cards", 10, "Recall the Japanese term for downspout."),
        ("cards", 5, "Listen for the Japanese word for magnet."),
        ("cards", 15, "Type the question asking whether the dumpster is full."),
        ("cards", 12, "Ask to be told when the magnetic nail sweep is finished."),
        ("reader", 3, "Write the instruction to check gutters for nails and debris."),
    ),
    29: (
        ("reader", 4, "Find which section remains unfinished."),
        ("cards", 1, "Recall the Japanese term for punch list."),
        ("cards", 4, "Listen for the Japanese term for open item."),
        ("cards", 13, "Type the sentence 'This is still open.'"),
        ("cards", 10, "Ask which areas remain open for tomorrow."),
        ("reader", 6, "Write the instruction to add the item to the punch list."),
    ),
    30: (
        ("reader", 5, "Find which materials the crew installs after deck preparation."),
        ("cards", 5, "Recall the Japanese term for closeout."),
        ("cards", 7, "Listen for the Japanese term for underlayment."),
        ("cards", 15, "Type the sentence 'Tear-off first, then installation.'"),
        ("cards", 14, "Ask the crew to walk the roof before calling the job complete."),
        ("reader", 9, "Write where the remaining items are recorded for closeout."),
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
        assert json.loads(path.read_text()) == expected, f"Core {group} activities differ from their source"
        total += len(expected["activities"])
    print(f"Japanese Roofing Core 19–30: {total} exact-pair activities verified; private and disabled")


if __name__ == "__main__":
    main()
