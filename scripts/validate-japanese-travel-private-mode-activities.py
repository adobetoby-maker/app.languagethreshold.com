#!/usr/bin/env python3
"""Validate private Japanese Breakfast activity drafts against exact source pairs."""
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-travel-breakfast"
TICKETS = ROOT / "docs/japanese-program/tickets.json"
MODES = {"see", "recall", "hear", "type", "say", "write"}


def main():
    all_activities = []
    for path in sorted(CONTENT.glob("private-mode-activities-*.json")):
        batch = json.loads(path.read_text())
        source_path = ROOT / batch["source"]
        raw = source_path.read_bytes()
        source = json.loads(raw)
        assert batch["sourceSha256"] == hashlib.sha256(raw).hexdigest(), path
        assert batch["pairKey"] == "Japanese:English"
        assert batch["reviewed"] is False
        assert batch["registered"] is False
        assert batch["audioListeningReviewed"] is False
        assert source["reviewed"] is False and source["registered"] is False
        lessons = {lesson["stableId"]: lesson for lesson in source["lessons"]}
        for item in batch["activities"]:
            lesson_id = item["lessonId"]
            assert lesson_id in lessons, item["id"]
            assert item["mode"] in MODES
            assert item["id"] == f"{lesson_id}:{item['mode']}:pilot-1"
            assert item["readyForLearner"] is False
            assert item["recordedAudioRequired"] is (item["mode"] == "hear")
            assert item["responseKind"] == ("open" if item["mode"] in ("say", "write") else "fixed")
            assert item["cueEnglish"].strip()
            prefix = lesson_id + ":"
            assert item["sourceRef"].startswith(prefix)
            field, ordinal = item["sourceRef"][len(prefix):].split(":")
            assert field in ("cards", "reader")
            entry = lessons[lesson_id][field][int(ordinal) - 1]
            assert item["modelJapanese"] == entry["ja"]
            assert item["modelEnglish"] == entry["en"]
            all_activities.append(item)

    ids = [item["id"] for item in all_activities]
    assert len(ids) == len(set(ids))
    groups = defaultdict(set)
    for item in all_activities:
        groups[item["lessonId"]].add(item["mode"])
    assert all(modes == MODES for modes in groups.values())
    assert all(count == 6 for count in Counter(item["lessonId"] for item in all_activities).values())

    tickets = json.loads(TICKETS.read_text())
    ticket = tickets["tracks"]["travel-breakfast"]
    assert ticket["issue"] == 131
    assert len(groups) == ticket["privateAuthoredModeActivityLessons"]
    assert len(ids) == ticket["privateAuthoredModeActivities"]
    print(f"Japanese Breakfast private activities: {len(groups)} lessons, {len(ids)} exact-source drafts; release disabled")


if __name__ == "__main__":
    main()
