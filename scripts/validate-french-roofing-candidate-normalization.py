#!/usr/bin/env python3
"""Read-only check of the bounded French Roofing candidate schema normalization.

Compares current files with the supplied Git baseline; only absent false flags and
missing exact original-scope metadata may be added. Never authors or registers data.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASELINE = "82f7a259dcbbbd40448ce40e4e1969ad1884ec35"


def git_bytes(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def omissions(items):
    values = list(items)
    return {
        "lessons": len(values),
        "dictionaryRegisteredMissing": sum(
            "registered" not in row for item in values for row in item["dictionaryMappings"]
        ),
        "qualifiedEnglishMissing": sum("qualifiedEnglish" not in item["gates"] for item in values),
        "objectiveMissing": sum("sourceObjectiveEnglish" not in item for item in values),
        "speakingMissing": sum("sourceSpeakingEnglish" not in item for item in values),
        "incompleteStatusMissing": sum("sourceObjectiveCompletionStatus" not in item for item in values),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", default=DEFAULT_BASELINE)
    args = parser.parse_args()
    baseline = git_bytes("rev-parse", args.baseline).decode().strip()
    paths = [
        p for p in git_bytes("ls-tree", "-r", "--name-only", baseline,
                            "content/french-roofing/candidates").decode().splitlines()
        if p.endswith("/candidate.json")
    ]
    assert len(paths) == 60, "Expected Foundation10/Core30/Master20 candidate files"
    old_files, new_files, changed = [], [], []
    pins_checked = 0
    for path in paths:
        old = json.loads(git_bytes("show", baseline + ":" + path))
        new = json.loads((ROOT / path).read_text())
        old_files.append(old)
        new_files.append(new)
        source_path = ROOT / new["sourcePacket"]["path"]
        source_bytes = source_path.read_bytes()
        assert hashlib.sha256(source_bytes).hexdigest() == new["sourcePacket"]["sha256"], path
        source = json.loads(source_bytes)
        hashes = source.get("sourceFileSha256")
        if hashes is None:
            hashes = {
                value["path"]: value["sha256"]
                for value in source.get("source", {}).values()
                if isinstance(value, dict) and "path" in value and "sha256" in value
            }
        assert hashes, "Underlying source pins absent: " + path
        for file_path, digest in hashes.items():
            assert hashlib.sha256((ROOT / file_path).read_bytes()).hexdigest() == digest, file_path
            pins_checked += 1
        assert new["sourceObjectiveEnglish"] == source["sourceObjectiveEnglish"], path
        assert new["sourceSpeakingEnglish"] == source["sourceSpeakingEnglish"], path
        assert "incomplete" in new["sourceObjectiveCompletionStatus"].lower() or \
               "held" in new["sourceObjectiveCompletionStatus"].lower(), path
        assert new["reviewed"] is False, path
        assert all(value is False for value in new["gates"].values()), path
        assert new["selectedFrench"] is new["audioScript"] is None, path
        assert len(old["dictionaryMappings"]) == len(new["dictionaryMappings"]), path

        # Remove only the explicitly authorized newly added fields. Every authored
        # string, source face, hold, activity/form, speaking draft and ID must match.
        restored = copy.deepcopy(new)
        for old_row, new_row, restored_row in zip(old["dictionaryMappings"], new["dictionaryMappings"],
                                                restored["dictionaryMappings"]):
            assert new_row["registered"] is False, path
            if "registered" not in old_row:
                restored_row.pop("registered")
        assert restored["gates"]["qualifiedEnglish"] is False, path
        if "qualifiedEnglish" not in old["gates"]:
            restored["gates"].pop("qualifiedEnglish")
        for key in ("sourceObjectiveEnglish", "sourceSpeakingEnglish", "sourceObjectiveCompletionStatus"):
            if key not in old:
                restored.pop(key)
        assert restored == old, "Unexpected authored/ID/source/gate mutation: " + path
        if new != old:
            changed.append(path)
    before, after = omissions(old_files), omissions(new_files)
    assert after == {key: (60 if key == "lessons" else 0) for key in after}, after
    print(json.dumps({
        "status": "PASS", "baseline": baseline, "before": before, "after": after,
        "changedCandidateFiles": len(changed), "sourcePinChecks": pins_checked,
        "preservation": "All authored text, IDs, source pins, rows/holds, activities/forms, speaking revisions, alternatives and gates preserved except authorized additions.",
        "changedPaths": changed,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
