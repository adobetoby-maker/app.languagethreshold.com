#!/usr/bin/env python3
"""Build and verify private, source-linked Japanese Roofing Master 10–20 activities."""

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODES = ("see", "recall", "hear", "type", "say", "write")
GROUPS = {
    "10-11": "content/japanese-roofing/master-10-11-draft.json",
    "12": "content/japanese-roofing/master-12-draft.json",
    "13-15": "content/japanese-roofing/master-13-15-draft.json",
    "16-18": "content/japanese-roofing/master-16-18-draft.json",
    "19-20": "content/japanese-roofing/master-19-20-draft.json",
}
SPEC = {
    10: (
        ("reader", 9, "Find what Kevin witnessed at the end of the shift."),
        ("cards", 3, "Recall the Japanese term for misunderstanding."),
        ("cards", 13, "Listen for the Japanese term for a tarp tie-down."),
        ("cards", 17, "Type the request for the speakers to talk one at a time."),
        ("cards", 18, "Ask Marcos to tell his side of the disagreement."),
        ("reader", 14, "Write the new rule for checking and photographing every tarp tie-down."),
    ),
    11: (
        ("reader", 11, "Find the symptoms Rogelio names as signs of heat exhaustion."),
        ("cards", 3, "Recall the Japanese clinical term for heatstroke."),
        ("cards", 2, "Listen for the Japanese clinical term for heat exhaustion."),
        ("cards", 19, "Type the instruction to report dizziness right away."),
        ("reader", 10, "Tell a new coworker to report dizziness immediately."),
        ("reader", 12, "Write Rogelio's statement about heatstroke and calling 911."),
    ),
    12: (
        ("reader", 2, "Find what changes when the same news is told to different listeners."),
        ("cards", 8, "Recall the Japanese respectful name suffix taught here."),
        ("cards", 1, "Listen for the Japanese phrase about speaking politely."),
        ("cards", 21, "Type the polite question asking how someone wants to be addressed."),
        ("cards", 18, "Ask the homeowner politely whether you may show the area."),
        ("reader", 9, "Write the concise, polite report to the manager about the roof deck."),
    ),
    13: (
        ("reader", 3, "Find whether Julio's lanyard was connected during the move to the ladder."),
        ("cards", 2, "Recall the Japanese term for incident report."),
        ("cards", 10, "Listen for the Japanese term for paramedics."),
        ("cards", 20, "Type the question asking for the exact time of the fall."),
        ("cards", 21, "Tell the supervisor that an accident occurred."),
        ("reader", 14, "Write the report's description of the move from roof to ladder."),
    ),
    14: (
        ("reader", 2, "Find how close the falling bundle came to the pedestrian."),
        ("cards", 1, "Recall the Japanese term for near-miss."),
        ("cards", 4, "Listen for the Japanese term for roof bracket."),
        ("cards", 19, "Type the question asking what can prevent a repeat event."),
        ("cards", 22, "Apologize to the pedestrian for the scare."),
        ("reader", 16, "Write Marcos's proposed danger-zone and warning-sign change."),
    ),
    15: (
        ("reader", 10, "Find what the radar shows and the radio instruction that follows."),
        ("cards", 2, "Recall the Japanese term for storm cell."),
        ("cards", 6, "Listen for the Japanese word for gust."),
        ("cards", 20, "Type the radio question 'Do you copy?'"),
        ("cards", 17, "Give the crew the radio instruction to come down if thunder is heard."),
        ("reader", 16, "Write the confirmation Rogelio gives the homeowner about the weather stop."),
    ),
    16: (
        ("reader", 13, "Find the correction the inspector records for the garage wall."),
        ("cards", 7, "Recall the Japanese term for correction notice."),
        ("cards", 1, "Listen for the Japanese term for city inspector."),
        ("cards", 19, "Type the polite request to identify what needs correction."),
        ("cards", 16, "Ask the inspector whether they prefer the roof or photos."),
        ("reader", 14, "Write Rogelio's plan to correct the item and request re-inspection."),
    ),
    17: (
        ("reader", 12, "Find the two remaining items in the daily report."),
        ("cards", 5, "Recall the Japanese term for a roofing square."),
        ("cards", 6, "Listen for the Japanese term for deck repair."),
        ("cards", 16, "Type the sentence reporting three replaced sheets of rotten deck."),
        ("cards", 21, "Ask Kevin informally to send the plywood photos."),
        ("reader", 8, "Write the formal report sentence linking the repair to the signed change order."),
    ),
    18: (
        ("reader", 4, "Find the requested new start day after the rain delay."),
        ("cards", 5, "Recall the Japanese term for rain delay."),
        ("cards", 3, "Listen for the Japanese term for voicemail."),
        ("cards", 16, "Type the polite question about starting on Thursday."),
        ("cards", 19, "Ask who is speaking when an unknown number calls."),
        ("reader", 15, "Write the confirmed Friday arrival time and advance-notice promise."),
    ),
    19: (
        ("reader", 6, "Find the two distinct warranties Rogelio explains."),
        ("cards", 8, "Recall the Japanese term for a warranty exclusion."),
        ("cards", 4, "Listen for the Japanese term for installation warranty."),
        ("cards", 21, "Type the question asking whether the homeowner has questions before signing."),
        ("cards", 19, "Offer to inspect the attic with the homeowner."),
        ("reader", 10, "Write the source's distinction among normal wear, storm damage, and an installation defect."),
    ),
    20: (
        ("reader", 3, "Find the three priorities in the morning plan."),
        ("cards", 10, "Recall the Japanese term for checklist."),
        ("cards", 6, "Listen for the Japanese term for emergency repair."),
        ("cards", 19, "Type the instruction for everyone to come down if thunder starts."),
        ("cards", 21, "Ask the owner politely whether you may explain the plan."),
        ("reader", 16, "Write what was recorded about the near-miss and the work remaining tomorrow."),
    ),
}


def build(group, source_path):
    raw = (ROOT / source_path).read_bytes()
    source = json.loads(raw)
    assert source["target"] == "Japanese" and source["native"] == "English"
    assert source["reviewed"] is False and source["registered"] is False
    numbers = list(map(int, group.split("-")))
    start, end = (numbers[0], numbers[-1])
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
    print(f"Japanese Roofing Master 10–20: {total} exact-pair activities verified; private and disabled")


if __name__ == "__main__":
    main()
