#!/usr/bin/env python3
"""Audit all private Japanese Roofing six-mode activities against lesson sources."""

from collections import Counter
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODES = {"see", "recall", "hear", "type", "say", "write"}


def main():
    paths = sorted((ROOT / "content/japanese-roofing").glob("private-mode-activities-*.json"))
    assert len(paths) == 21, f"Expected 21 source-group sidecars, found {len(paths)}"
    activities = []
    for path in paths:
        data = json.loads(path.read_text())
        source_path = ROOT / data["source"]
        raw = source_path.read_bytes()
        assert data["sourceSha256"] == hashlib.sha256(raw).hexdigest(), path
        assert data["pairKey"] == "Japanese:English", path
        assert data["reviewed"] is False and data["registered"] is False, path
        assert data["audioListeningReviewed"] is False, path
        source = json.loads(raw)
        assert source["target"] == "Japanese" and source["native"] == "English", path
        lessons = {lesson["stableId"]: lesson for lesson in source["lessons"]}
        for activity in data["activities"]:
            lesson_id = activity["lessonId"]
            ref_lesson, collection, index = activity["sourceRef"].rsplit(":", 2)
            assert ref_lesson == lesson_id and collection in ("cards", "reader"), activity["id"]
            pair = lessons[lesson_id][collection][int(index) - 1]
            assert (activity["modelJapanese"], activity["modelEnglish"]) == (pair["ja"], pair["en"]), activity["id"]
            assert activity["id"] == f"{lesson_id}:{activity['mode']}:private-1", activity["id"]
            assert activity["responseKind"] == ("open" if activity["mode"] in ("say", "write") else "fixed"), activity["id"]
            assert activity["recordedAudioRequired"] == (activity["mode"] == "hear"), activity["id"]
            assert activity["readyForLearner"] is False and activity["cueEnglish"], activity["id"]
            activities.append(activity)
    ids = [activity["id"] for activity in activities]
    lesson_ids = {activity["lessonId"] for activity in activities}
    assert len(activities) == 360 and len(ids) == len(set(ids)) and len(lesson_ids) == 60
    for lesson_id in lesson_ids:
        assert {activity["mode"] for activity in activities if activity["lessonId"] == lesson_id} == MODES, lesson_id
    stages = Counter("foundation" if lesson_id.startswith("foundation-") else "master" if lesson_id.startswith("master-") else "core" for lesson_id in lesson_ids)
    assert stages == {"foundation": 10, "core": 30, "master": 20}, stages
    print("Japanese Roofing private activities: F10/C30/M20; 360 exact-pair tasks; all disabled")


if __name__ == "__main__":
    main()
