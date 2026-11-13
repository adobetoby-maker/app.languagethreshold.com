#!/usr/bin/env python3
"""Build and verify private Japanese Roofing Foundation 4–10 activities."""

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODES = ("see", "recall", "hear", "type", "say", "write")
GROUPS = {
    "4-6": "content/japanese-roofing/foundation-4-6-draft.json",
    "7-10": "content/japanese-roofing/foundation-7-10-draft.json",
}

# Every reference selects an exact Japanese/English card or Reader pair.
SPEC = {
    4: (
        ("reader", 4, "Find which protective items the speaker has and what is still needed."),
        ("cards", 8, "Recall the Japanese word for broom."),
        ("cards", 3, "Listen for the Japanese word for gloves."),
        ("cards", 10, "Type the Japanese sentence 'I need more nails.'"),
        ("reader", 3, "Tell a coworker that you are thirsty and want cold water."),
        ("reader", 5, "Write a jobsite request for more shingle nails."),
    ),
    5: (
        ("reader", 7, "Find what work the crew plans to start tomorrow."),
        ("cards", 4, "Recall the Japanese word for 'after, later'."),
        ("cards", 2, "Listen for the Japanese word meaning tomorrow."),
        ("cards", 10, "Type the Japanese question 'Can you help me?'"),
        ("reader", 5, "Ask a coworker to help carry the ladder."),
        ("reader", 3, "Write what you are going to do on the roof now."),
    ),
    6: (
        ("reader", 4, "Find which task each coworker does."),
        ("cards", 8, "Recall the Japanese word for lunch."),
        ("cards", 5, "Listen for the Japanese word for coworker."),
        ("cards", 10, "Type the Japanese sentence 'We go up at seven.'"),
        ("reader", 1, "Tell someone how many days a week you work on roofs."),
        ("reader", 7, "Write what the crew does at the end of the day."),
    ),
    7: (
        ("reader", 5, "Find the two questions about material quantity and shingle color."),
        ("cards", 6, "Recall the Japanese question word for 'how'."),
        ("cards", 4, "Listen for the Japanese question word meaning when."),
        ("cards", 9, "Type the Japanese question 'Where is the ladder?'"),
        ("reader", 6, "Ask what to do first and how to put on the full-body harness."),
        ("reader", 4, "Write a question asking when the material arrives."),
    ),
    8: (
        ("reader", 5, "Find what additional bundle and nails the speaker needs."),
        ("cards", 7, "Recall the Japanese word for 'still, yet'."),
        ("cards", 3, "Listen for the Japanese expression meaning nothing."),
        ("cards", 12, "Type the Japanese sentence 'I need another bundle.'"),
        ("reader", 7, "Tell a coworker you do not understand and ask them to speak slower."),
        ("reader", 6, "Write that fewer shingles are used today than yesterday."),
    ),
    9: (
        ("reader", 2, "Find the polite request for the hammer."),
        ("cards", 3, "Recall the Japanese expression for 'excuse me' when passing."),
        ("cards", 6, "Listen for the Japanese request to wait."),
        ("cards", 11, "Type the Japanese request 'Wait here, please.'"),
        ("reader", 4, "Ask someone to come here and bring the ladder."),
        ("reader", 3, "Write a thank-you and apology for the wait."),
    ),
    10: (
        ("reader", 3, "Find what happened to the coworker on the ladder."),
        ("cards", 6, "Recall the Japanese term for fall protection."),
        ("cards", 3, "Listen for the Japanese word for ambulance."),
        ("cards", 10, "Type the Japanese sentence 'I need help.'"),
        ("reader", 7, "Ask what the word for a fall means."),
        ("reader", 2, "Write that there is a fall-protection equipment inspection today."),
    ),
}


def build(group, source_path):
    source_bytes = (ROOT / source_path).read_bytes()
    source = json.loads(source_bytes)
    assert source["target"] == "Japanese" and source["native"] == "English"
    assert source["reviewed"] is False and source["registered"] is False
    start, end = map(int, group.split("-"))
    expected_numbers = set(range(start, end + 1))
    assert {lesson["n"] for lesson in source["lessons"]} == expected_numbers
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
    assert len(activities) == len(expected_numbers) * 6
    assert len({a["id"] for a in activities}) == len(activities)
    return {
        "schema": 1,
        "state": "private-authored-activity-draft",
        "pairKey": "Japanese:English",
        "source": source_path,
        "sourceSha256": hashlib.sha256(source_bytes).hexdigest(),
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
        path = ROOT / f"content/japanese-roofing/private-mode-activities-foundation-{group}.json"
        if args.write:
            path.write_text(json.dumps(expected, ensure_ascii=False, indent=2) + "\n")
        assert json.loads(path.read_text()) == expected, f"Stale or changed private activities: {group}"
        total += len(expected["activities"])
    print(f"Japanese Roofing F4–10: {total} source-pinned activities verified; private and disabled")


if __name__ == "__main__":
    main()
