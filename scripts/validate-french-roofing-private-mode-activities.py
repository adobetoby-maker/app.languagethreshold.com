#!/usr/bin/env python3
"""Check private French Roofing activity coverage and exact source pairs."""
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "private-runtime-candidate.json"
MODES = {"see", "recall", "hear", "type", "say", "write"}


def main():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert source["releaseGate"]["enabled"] is False
    lessons = {lesson["draftLessonKey"]: lesson for lesson in source["lessons"]}
    expected_lessons = {f"foundation:{n}" for n in range(1, 11)}
    expected_lessons |= {f"core:{n}" for n in range(1, 31)}
    expected_lessons |= {f"master:{n}" for n in range(1, 21)}
    assert set(lessons) == expected_lessons

    activities = []
    for path in sorted(CONTENT.glob("private-mode-activities-*.json")):
        batch = json.loads(path.read_text())
        assert batch["sourceSha256"] == hashlib.sha256(raw).hexdigest(), path
        assert batch["targetLanguage"] == "French"
        assert batch["nativeLanguage"] == "English"
        assert batch["reviewed"] is False
        assert batch["registered"] is False
        assert batch["audioListeningReviewed"] is False
        activities.extend(batch["activities"])

    assert len(activities) == 360, len(activities)
    assert len({item["id"] for item in activities}) == 360
    by_lesson = Counter(item["lessonKey"] for item in activities)
    assert set(by_lesson) == expected_lessons
    assert all(count == 6 for count in by_lesson.values())

    for item in activities:
        key = item["lessonKey"]
        mode = item["mode"]
        assert mode in MODES
        assert item["id"] == f"{key}:{mode}:pilot-1"
        assert item["readyForLearner"] is False
        assert item["recordedAudioRequired"] is (mode == "hear")
        assert item["responseKind"] == ("open" if mode in ("say", "write") else "fixed")
        assert item["cueEnglish"].strip()
        ref = item["sourceRef"]
        assert ref.startswith(f"{key}:")
        kind = ref.split(":")[2]
        collection = lessons[key]["reader" if kind == "line" else "words"]
        matches = [entry for entry in collection if entry["id"] == ref]
        assert len(matches) == 1, ref
        assert item["modelFrench"] == matches[0]["targetFrench"]
        assert item["modelEnglish"] == matches[0]["supportEnglish"]

    for key in expected_lessons:
        assert {item["mode"] for item in activities if item["lessonKey"] == key} == MODES
    print("French Roofing private activity coverage: 60 lessons, 360 exact-source drafts, six modes each; release disabled")


if __name__ == "__main__":
    main()
