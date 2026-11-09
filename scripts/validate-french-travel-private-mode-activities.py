#!/usr/bin/env python3
"""Validate cumulative private French Breakfast mode drafts against exact pairs."""
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content/french-travel-breakfast"
SOURCE = BASE / "private-runtime-candidate.json"
SIDECARS = (
    BASE / "private-mode-activities-foundation-1-3.json",
    BASE / "private-mode-activities-foundation-4-10.json",
    BASE / "private-mode-activities-core-1-3.json",
    BASE / "private-mode-activities-core-4-9.json",
    BASE / "private-mode-activities-core-10-15.json",
    BASE / "private-mode-activities-core-16-21.json",
)
MODES = {"see", "recall", "hear", "type", "say", "write"}


def main():
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)
    assert source["releaseGate"]["enabled"] is False
    lessons = {x["draftLessonKey"]: x for x in source["lessons"]}
    sha = hashlib.sha256(source_bytes).hexdigest()
    by_lesson = defaultdict(set)
    ids = set()
    count = 0
    for path in SIDECARS:
        sidecar = json.loads(path.read_text())
        assert sidecar["sourceSha256"] == sha, path
        assert sidecar["sourceFixture"] == str(SOURCE.relative_to(ROOT)), path
        assert (sidecar["targetLanguage"], sidecar["nativeLanguage"]) == ("French", "English")
        assert sidecar["reviewed"] is False and sidecar["registered"] is False
        assert sidecar["audioListeningReviewed"] is False
        for activity in sidecar["activities"]:
            key = activity["lessonKey"]
            assert key in lessons and (key.startswith("foundation:") or key.startswith("core:")), key
            mode = activity["mode"]
            assert mode in MODES and mode not in by_lesson[key], (key, mode)
            by_lesson[key].add(mode)
            assert activity["id"] == f"{key}:{mode}:pilot-1"
            assert activity["id"] not in ids
            ids.add(activity["id"])
            assert activity["readyForLearner"] is False
            assert activity["recordedAudioRequired"] is (mode == "hear")
            assert activity["responseKind"] == ("open" if mode in {"say", "write"} else "fixed")
            assert activity["cueEnglish"].strip()
            ref = activity["sourceRef"]
            assert ref.startswith(f"{key}:"), ref
            collection = lessons[key]["reader"] if ":line:" in ref else lessons[key]["words"]
            matches = [x for x in collection if x["id"] == ref]
            assert len(matches) == 1, ref
            pair = matches[0]
            assert activity["modelFrench"] == pair["targetFrench"], ref
            assert activity["modelEnglish"] == pair["supportEnglish"], ref
            count += 1
    assert set(by_lesson) == ({f"foundation:{n}" for n in range(1, 11)} |
                              {f"core:{n}" for n in range(1, 22)})
    assert all(modes == MODES for modes in by_lesson.values())
    assert count == 186
    print("French Breakfast Foundation 1–10 and Core 1–21: 186 exact-pair private activities; release gates closed")


if __name__ == "__main__":
    main()
