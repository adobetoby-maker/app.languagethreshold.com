#!/usr/bin/env python3
"""Check private French Roofing Foundation 10/Core 30/Master 20 draft continuity."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SCRIPTS = ROOT / "scripts"


def main() -> None:
    for validator in sorted(SCRIPTS.glob("validate-french-roofing-*-draft.py")):
        if validator.name == Path(__file__).name:
            continue
        subprocess.run([sys.executable, str(validator)], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    subprocess.run([sys.executable, str(SCRIPTS / "validate-french-roofing-pilot.py")], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)

    expected_batches = {
        "foundation": [(1, 3), (4, 6), (7, 10)],
        "core": [(1, 3), (4, 6), (7, 9), (10, 12), (13, 15), (16, 18), (19, 21), (22, 24), (25, 27), (28, 30)],
        "master": [(1, 3), (4, 6), (7, 9), (10, 12), (13, 15), (16, 18), (19, 20)],
    }
    expected_counts = {"foundation": 10, "core": 30, "master": 20}
    totals = {"foundation": 0, "core": 0, "master": 0}
    for stage, batches in expected_batches.items():
        ids = []
        for start, end in batches:
            path = CONTENT / f"{stage}-{start}-{end}-draft.json"
            draft = json.loads(path.read_text())
            assert (draft["moduleId"], draft["stage"], draft["target"], draft["native"]) == ("roofing", stage, "French", "English")
            assert draft["state"] == "translation-draft" and draft["reviewed"] is False
            for lesson in draft["lessons"]:
                ids.append(lesson["n"])
                assert lesson.get("reviewed", False) is False
                assert lesson["reading"]["target"] and lesson["reading"]["native"]
                assert len(lesson["reading"]["target"]) == len(lesson["reading"]["native"])
                assert lesson["words"] and all(word["en"] and word["fr"] for word in lesson["words"])
            builder = SCRIPTS / f"build-french-roofing-{stage}-{start}-{end}-draft.py"
            if builder.exists():
                before = hashlib.sha256(path.read_bytes()).hexdigest()
                subprocess.run([sys.executable, str(builder)], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
                after = hashlib.sha256(path.read_bytes()).hexdigest()
                assert before == after, f"non-deterministic regeneration: {path.name}"
        assert ids == list(range(1, expected_counts[stage] + 1)), (stage, ids)
        totals[stage] = len(ids)
    tickets = json.loads((ROOT / "docs/french-program/tickets.json").read_text())
    def find_ticket(value):
        if isinstance(value, dict):
            if value.get("ticketId") == "FR-013":
                return value
            for child in value.values():
                result = find_ticket(child)
                if result:
                    return result
        elif isinstance(value, list):
            for child in value:
                result = find_ticket(child)
                if result:
                    return result
        return None
    progress = find_ticket(tickets)["draftProgress"]
    assert all(progress[stage] == count for stage, count in expected_counts.items())
    assert progress["registeredValidatedLessons"] == 0 and progress["reviewed"] is False and progress["audioReady"] is False
    print(f"French Roofing private draft: F{totals['foundation']}/C{totals['core']}/M{totals['master']} contiguous; exact-source validators and deterministic builders pass; unreleased")


if __name__ == "__main__":
    main()
