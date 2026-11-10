#!/usr/bin/env python3
"""Join source-pinned Japanese Lunch batches without registering a learner course."""

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSE = ROOT / "content/japanese-travel-lunch"
OUTPUT = COURSE / "private-runtime-candidate.json"
MODES = ("see", "recall", "hear", "type", "say", "write")
STAGES = {
    "foundation": ("foundation-travel-lunch", 10),
    "core": ("travel-lunch", 30),
    "master": ("master-travel-lunch", 20),
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    subprocess.run([sys.executable, str(COURSE / "verify-private-course.py")],
                   cwd=ROOT, check=True, capture_output=True)
    records = {stage: {} for stage in STAGES}
    sources = []
    for path in sorted(COURSE.glob("*-draft.json")):
        match = re.fullmatch(r"(foundation|core|master)-(\d+)-(\d+)-draft\.json", path.name)
        if not match:
            raise ValueError(f"Unexpected batch: {path.name}")
        stage, first, last = match.group(1), int(match.group(2)), int(match.group(3))
        side_path = COURSE / f"private-mode-activities-{stage}-{first}-{last}.json"
        draft = json.loads(path.read_text(encoding="utf-8"))
        side = json.loads(side_path.read_text(encoding="utf-8"))
        if (draft["stageId"], draft["target"], draft["native"], draft["reviewed"],
            draft["registered"], draft["audio"], side["pairKey"], side["sourceSha256"],
            side["reviewed"], side["registered"], side["audioListeningReviewed"]) != (
            STAGES[stage][0], "Japanese", "English", False, False, "none",
            "Japanese:English", sha(path), False, False, False):
            raise ValueError(f"Batch review, pair, or source changed: {path.name}")
        for kind in ("curriculum", "map", "reader"):
            source_path = draft["source"].get(f"{kind}Path")
            source_sha = draft["source"].get(f"{kind}Sha256")
            if bool(source_path) != bool(source_sha):
                raise ValueError(f"Incomplete English source pin: {path.name}/{kind}")
            if source_path and sha(ROOT / source_path) != source_sha:
                raise ValueError(f"English source changed: {source_path}")
        source_ref = str(path.relative_to(ROOT))
        side_ref = str(side_path.relative_to(ROOT))
        sources.extend(({"path": source_ref, "sha256": sha(path), "englishSource": draft["source"]},
                        {"path": side_ref, "sha256": sha(side_path)}))
        activities = {}
        for activity in side["activities"]:
            activities.setdefault(activity["lessonId"], {})[activity["mode"]] = activity
        for lesson in draft["lessons"]:
            number = lesson["n"]
            identity = f"{STAGES[stage][0]}:{number}:ja-en"
            if lesson["stableId"] != identity or number in records[stage]:
                raise ValueError(f"Duplicate or changed lesson: {identity}")
            modes = activities.get(identity)
            if not modes or set(modes) != set(MODES):
                raise ValueError(f"Missing authored modes: {identity}")
            cards = [{**card, "id": f"{identity}:card:{i}"}
                     for i, card in enumerate(lesson["cards"], 1)]
            for mode, activity in modes.items():
                if activity["sourceRef"] not in {card["id"] for card in cards}:
                    raise ValueError(f"Mode source card changed: {identity}:{mode}")
            records[stage][number] = {
                "moduleId": STAGES[stage][0], "lessonNumber": number,
                "stableId": identity, "title": lesson["title"],
                "objective": lesson["objective"], "focus": lesson["focus"],
                "scene": lesson["scene"], "cards": cards,
                "reader": lesson["reader"],
                "speaking": {**lesson["speaking"], "wordBank": [card["ja"] for card in cards]},
                "modes": {mode: modes[mode] for mode in MODES},
                "sourceBatch": source_ref, "reviewed": False,
            }
    ordered = [records[stage][n] for stage, (_, count) in STAGES.items()
               for n in range(1, count + 1)]
    if (len(ordered), sum(len(x["cards"]) for x in ordered),
        sum(len(x["reader"]) for x in ordered)) != (60, 1099, 760):
        raise ValueError("Course counts changed")
    return {
        "schema": 1, "pairKey": "Japanese:English", "moduleId": "travel-lunch",
        "registration": "disabled", "reviewed": False,
        "audioListeningReviewed": False, "lessonCount": 60,
        "cardCount": 1099, "readerTurnCount": 760, "activityCount": 360,
        "sourceFiles": sources, "lessons": ordered,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != rendered:
            raise SystemExit("Japanese Lunch private runtime candidate is stale")
        print("Japanese Lunch private runtime candidate matches 60 current lessons")
    else:
        OUTPUT.write_text(rendered, encoding="utf-8")
        print(f"Wrote {OUTPUT}")
