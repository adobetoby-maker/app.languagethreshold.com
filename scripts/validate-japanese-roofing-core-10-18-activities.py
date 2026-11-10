#!/usr/bin/env python3
"""Build and verify private Japanese Roofing Core 10–18 six-mode activities."""

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODES = ("see", "recall", "hear", "type", "say", "write")
GROUPS = {
    "10-12": "content/japanese-roofing/core-10-12-draft.json",
    "13-15": "content/japanese-roofing/core-13-15-draft.json",
    "16-18": "content/japanese-roofing/core-16-18-draft.json",
}
SPEC = {
    10: (
        ("reader", 3, "Find where the unfinished roof section is located."),
        ("cards", 6, "Recall the Japanese term for weather forecast."),
        ("cards", 1, "Listen for the Japanese word for tarp."),
        ("cards", 13, "Type the Japanese sentence 'Rain is coming tonight.'"),
        ("cards", 14, "Ask the crew to repeat the plan to confirm it."),
        ("reader", 7, "Write the instruction to tie the tarp down with rope."),
    ),
    11: (
        ("reader", 9, "Find where the overhang measurement is recorded."),
        ("cards", 8, "Recall the Japanese term for overhang."),
        ("cards", 3, "Listen for the Japanese term for starter strip."),
        ("cards", 11, "Type the question asking whether the chalk line is straight."),
        ("cards", 12, "Tell a worker to measure from the edge."),
        ("reader", 8, "Write the instruction to place the starter strip along the eave."),
    ),
    12: (
        ("reader", 4, "Find the six-inch stagger in the guide's example."),
        ("cards", 2, "Recall the Japanese term for stagger."),
        ("cards", 1, "Listen for the Japanese term for joint."),
        ("cards", 11, "Type that the joints must not line up."),
        ("cards", 12, "Ask what stagger this particular job requires."),
        ("reader", 7, "Write a request to confirm this job's specification."),
    ),
    13: (
        ("reader", 5, "Find what the installers check before answering the drip-edge question."),
        ("cards", 7, "Recall the Japanese word for overlap."),
        ("cards", 1, "Listen for the Japanese term for drip edge."),
        ("cards", 11, "Type the question asking whether drip edge goes under or over underlayment."),
        ("cards", 14, "Ask the installers to explain this roof's drip-edge sequence."),
        ("reader", 6, "Write the plan-based instruction to start the drip edge at the eave."),
    ),
    14: (
        ("reader", 8, "Find what the worker measures again."),
        ("cards", 2, "Recall the Japanese term for overlap width."),
        ("cards", 6, "Listen for the Japanese term for plastic cap nails."),
        ("cards", 13, "Type the question asking whether the overlap is correct."),
        ("cards", 11, "Tell a worker to roll the underlayment out straight."),
        ("reader", 9, "Write the instruction to fasten underlayment with plastic cap nails."),
    ),
    15: (
        ("reader", 1, "Find what happens to water in the roof valley."),
        ("cards", 5, "Recall the Japanese term for backing paper."),
        ("cards", 2, "Listen for the Japanese term for ice and water shield."),
        ("cards", 15, "Type the question asking whether the valley is covered all the way."),
        ("cards", 11, "Ask to see the valley protection before it is covered."),
        ("reader", 6, "Write the instruction to press the membrane flat against the deck."),
    ),
    16: (
        ("reader", 2, "Find the location of the nail that is too high."),
        ("cards", 7, "Recall the Japanese term for nailing zone."),
        ("cards", 1, "Listen for the Japanese term for nailing strip."),
        ("cards", 11, "Type the Japanese sentence 'That nail is too high.'"),
        ("cards", 15, "Ask someone to show where the nailing strip is."),
        ("reader", 5, "Write the instruction to keep nails inside the nailing zone."),
    ),
    17: (
        ("reader", 3, "Find the guide's example nail count per shingle."),
        ("cards", 9, "Recall the Japanese term for number of nails."),
        ("cards", 1, "Listen for the Japanese term for nail pattern."),
        ("cards", 12, "Type the question asking how many nails this shingle needs."),
        ("cards", 15, "Tell a coworker you need the exact pattern for this product."),
        ("reader", 6, "Write the instruction to check this product's directions before setting its nail pattern."),
    ),
    18: (
        ("reader", 2, "Find how the nails appear after installation."),
        ("cards", 7, "Recall the Japanese term for nail head."),
        ("cards", 1, "Listen for the Japanese term for an overdriven nail."),
        ("cards", 11, "Type the instruction 'Stop. The nails are too deep.'"),
        ("cards", 15, "Tell the worker to adjust the nail gun."),
        ("reader", 4, "Write that the nail head must sit flush with the surface."),
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
    print(f"Japanese Roofing Core 10–18: {total} exact-pair activities verified; private and disabled")


if __name__ == "__main__":
    main()
