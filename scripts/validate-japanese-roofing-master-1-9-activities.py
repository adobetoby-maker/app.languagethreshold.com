#!/usr/bin/env python3
"""Build and verify private, source-linked Japanese Roofing Master 1–9 activities."""

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODES = ("see", "recall", "hear", "type", "say", "write")
GROUPS = {
    "1-3": "content/japanese-roofing/master-1-3-draft.json",
    "4-6": "content/japanese-roofing/master-4-6-draft.json",
    "7-9": "content/japanese-roofing/master-7-9-draft.json",
}
SPEC = {
    1: (
        ("reader", 15, "Find how Kevin summarizes the roof system's three stages."),
        ("cards", 7, "Recall the Japanese term for the ice and water shield."),
        ("cards", 12, "Listen for the Japanese term for ridge vent."),
        ("cards", 19, "Type the question 'Am I making sense?' in Japanese."),
        ("reader", 17, "Invite a client politely to ask you questions."),
        ("reader", 9, "Write how the starter strip and shingles follow the bottom-up sequence."),
    ),
    2: (
        ("reader", 7, "Find where water goes if shingle slots line up."),
        ("cards", 6, "Recall the Japanese term for the slot between shingle tabs."),
        ("cards", 2, "Listen for the Japanese verb meaning to stagger."),
        ("cards", 16, "Type that joints are staggered according to the manufacturer."),
        ("cards", 20, "Ask a homeowner politely whether you may explain the reason."),
        ("reader", 8, "Write what moisture can reach over time."),
    ),
    3: (
        ("reader", 8, "Find what happens to the nail head after Kevin fires the second nail."),
        ("cards", 12, "Recall the Japanese expression meaning flush."),
        ("cards", 4, "Listen for the Japanese term for an overdriven nail."),
        ("cards", 18, "Type the request to look closely at the nail head."),
        ("reader", 16, "Ask an experienced worker politely to check the local nailing method too."),
        ("reader", 7, "Write the instruction to seal the hole according to the product directions."),
    ),
    4: (
        ("reader", 7, "Find what the spec sheet says about fastening each piece."),
        ("cards", 7, "Recall the Japanese term for minimum overlap."),
        ("cards", 3, "Listen for the Japanese term for step flashing."),
        ("cards", 17, "Type the question asking what the sheet says about overlap."),
        ("cards", 21, "Ask the homeowner politely for a moment."),
        ("reader", 8, "Write the step about siding and sealant after placing flashing."),
    ),
    5: (
        ("reader", 11, "Find why the damaged deck was missing from the original estimate."),
        ("cards", 3, "Recall the Japanese term for change order."),
        ("cards", 2, "Listen for the Japanese term for rotten wood."),
        ("cards", 20, "Type the request for a signature on the change order."),
        ("cards", 19, "Offer to show the homeowner photos of the damage."),
        ("reader", 13, "Write the extra time and cost disclosed to the homeowner."),
    ),
    6: (
        ("reader", 8, "Find which substitute the contract rules out."),
        ("cards", 10, "Recall the Japanese term for architectural shingle."),
        ("cards", 4, "Listen for the Japanese term for substitute."),
        ("cards", 16, "Type the question asking when the rest will arrive."),
        ("reader", 12, "Tell the homeowner you will send a color photo before approval."),
        ("reader", 9, "Write the request for the spec sheet before making a decision."),
    ),
    7: (
        ("reader", 5, "Find the location and dimensions of the test square."),
        ("cards", 5, "Recall the Japanese term for test square."),
        ("cards", 1, "Listen for the Japanese term for insurance adjuster."),
        ("cards", 19, "Type the question asking how many impact marks were counted."),
        ("cards", 20, "Ask the adjuster politely to repeat the measurements more slowly."),
        ("reader", 8, "Write the observed count and granule loss in that square."),
    ),
    8: (
        ("reader", 11, "Find the alternative Rogelio offers the homeowner."),
        ("cards", 12, "Recall the Japanese term for alternative."),
        ("cards", 3, "Listen for the Japanese word for thunderstorm."),
        ("cards", 16, "Type the statement that underlayment cannot be skipped."),
        ("cards", 17, "Acknowledge the homeowner's hurry and decline the request."),
        ("reader", 12, "Write the forecast-dependent plan to finish by Friday."),
    ),
    9: (
        ("reader", 3, "Find why Rogelio calls Julio aside."),
        ("cards", 2, "Recall the Japanese term for shingle exposure."),
        ("cards", 1, "Listen for the Japanese term for a crooked course."),
        ("cards", 19, "Type the request to measure every three courses."),
        ("cards", 17, "Ask Julio what happened from his point of view."),
        ("reader", 10, "Write Rogelio's specific measurement and marking request."),
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
        path = ROOT / f"content/japanese-roofing/private-mode-activities-master-{group}.json"
        if args.write:
            path.write_text(json.dumps(expected, ensure_ascii=False, indent=2) + "\n")
        assert json.loads(path.read_text()) == expected, f"Master {group} activities differ from source"
        total += len(expected["activities"])
    print(f"Japanese Roofing Master 1–9: {total} exact-pair activities verified; private and disabled")


if __name__ == "__main__":
    main()
