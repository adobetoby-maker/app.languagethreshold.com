#!/usr/bin/env python3
"""Verify all private FR-001 reference clips and expose cross-batch ambiguity."""

import argparse
import importlib.util
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path("/Users/drive/lt-audio/french-pronunciation")
REPORT = ROOT / "docs/french-program/fr-001-private-full-audio-coverage.json"

BATCHES = (
    ("foundation-core-1-6", "private-f1-c6-2026-11-10", "fr-001-private-audio-evidence.json"),
    ("core-7-10", "private-core-7-10-2026-11-10", "fr-001-private-core-7-10-audio-evidence.json"),
    ("core-11-12", "private-core-11-12-2026-11-10", "fr-001-private-core-11-12-audio-evidence.json"),
    ("core-13-15", "private-core-13-15-2026-11-10", "fr-001-private-core-13-15-audio-evidence.json"),
    ("core-16-18", "private-core-16-18-2026-11-10", "fr-001-private-core-16-18-audio-evidence.json"),
    ("core-19-30", "private-core-19-30-2026-11-10", "fr-001-private-core-19-30-audio-evidence.json"),
    ("master-reference-1-20", "private-master-reference-1-20-2026-11-10", "fr-001-private-master-reference-1-20-audio-evidence.json"),
)


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


def build_report():
    scope_builder = module(ROOT / "scripts/build-french-pronunciation-audio-scope.py", "fr_scope")
    audio_verifier = module(ROOT / "scripts/verify-french-pronunciation-private-audio.py", "fr_audio")
    lesson_fields = defaultdict(set)
    lesson_batches = defaultdict(set)
    text_candidates = defaultdict(lambda: defaultdict(list))
    source_files = {}
    batch_reports = []
    total_occurrences = 0

    for scope_name, directory, evidence_name in BATCHES:
        inventory_path = scope_builder.SCOPES[scope_name][1]
        inventory = json.loads(inventory_path.read_text())
        manifest = json.loads((AUDIO / directory / "manifest.json").read_text())
        assert inventory == scope_builder.build(scope_name), f"Stale scope: {scope_name}"
        verified = audio_verifier.verify(AUDIO / directory, inventory_path)
        evidence_path = ROOT / "docs/french-program" / evidence_name
        assert json.loads(evidence_path.read_text()) == verified, f"Stale evidence: {evidence_name}"
        batch_reports.append({
            "scope": scope_name,
            "directory": str(AUDIO / directory),
            "lessons": verified["lessons"],
            "uniqueExactTexts": verified["uniqueExactTexts"],
            "verifiedClips": verified["verifiedClips"],
            "manifestSha256": verified["manifestSha256"],
        })
        for source in inventory["sourceFiles"]:
            prior = source_files.setdefault(source["path"], source["sha256"])
            assert prior == source["sha256"], source["path"]
        for row in inventory["texts"]:
            text = row["text"]
            key = row["sha256"]
            for occurrence in row["occurrences"]:
                total_occurrences += 1
                lesson_fields[occurrence["lessonId"]].add(occurrence["field"])
                lesson_batches[occurrence["lessonId"]].add(scope_name)
            for gender, clip in manifest["clips"][key].items():
                text_candidates[text][gender].append({
                    "batch": scope_name,
                    "file": str(AUDIO / directory / clip["name"]),
                    "sha256": clip["sha256"],
                    "durationSeconds": clip["durationSeconds"],
                })

    expected_fields = {*(f"cards[{n}].fr" for n in range(1, 11)),
                       *(f"reader[{n}].fr" for n in range(1, 5)),
                       "speaking.opening", "speaking.closure"}
    stages = {stage: [] for stage in ("foundation", "core", "master")}
    for lesson_id, fields in lesson_fields.items():
        prefix, number_text, pair = lesson_id.split(":")
        assert pair == "fr-en"
        stage = next((stage for stage in stages if prefix == f"{stage}-french-sound-like-a-native"), None)
        assert stage is not None, lesson_id
        number = int(number_text)
        stages[stage].append(number)
        assert fields == expected_fields, (lesson_id, sorted(expected_fields - fields), sorted(fields - expected_fields))
        assert len(lesson_batches[lesson_id]) == 1, lesson_id
    assert {stage: sorted(numbers) for stage, numbers in stages.items()} == {
        "foundation": list(range(1, 11)), "core": list(range(1, 31)), "master": list(range(1, 21))
    }

    overlaps = []
    conflicting_pairs = 0
    for text, genders in sorted(text_candidates.items()):
        assert set(genders) == {"female", "male"}
        assert {len(genders[gender]) for gender in genders} == {len(genders["female"])}
        if len(genders["female"]) == 1:
            continue
        for gender in genders:
            if len({candidate["sha256"] for candidate in genders[gender]}) > 1:
                conflicting_pairs += 1
        overlaps.append({"text": text, "candidates": dict(genders)})

    assert len(batch_reports) == 7
    assert sum(batch["verifiedClips"] for batch in batch_reports) == 1778
    assert total_occurrences == sum(map(len, lesson_fields.values())) == 960
    return {
        "schema": 1,
        "moduleId": "french-sound-like-a-native",
        "pairKey": "French:English",
        "state": "private-recorded-unreviewed-unregistered",
        "stageLessons": {stage: len(numbers) for stage, numbers in stages.items()},
        "recordedFieldOccurrences": sum(map(len, lesson_fields.values())),
        "requiredFieldsPerLesson": sorted(expected_fields),
        "batchTextVoiceClips": sum(batch["verifiedClips"] for batch in batch_reports),
        "uniqueExactTextsAcrossBatches": len(text_candidates),
        "uniqueTextVoicePairsAcrossBatches": len(text_candidates) * 2,
        "overlappingExactTexts": len(overlaps),
        "overlappingVoicePairsWithDifferentBytes": conflicting_pairs,
        "overlapCandidates": overlaps,
        "batches": batch_reports,
        "sourceFiles": dict(sorted(source_files.items())),
        "textVoiceHashDurationVerified": True,
        "listeningReviewed": False,
        "runtimeRegistered": False,
        "webPublished": False,
        "nativeBundled": False,
        "regionalHearMaster16And17Ready": False,
        "canonicalPlaybackSelectionMade": False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--check-report", action="store_true")
    args = parser.parse_args()
    report = build_report()
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.write_report:
        REPORT.write_text(encoded)
    if args.check_report:
        assert REPORT.read_text() == encoded, "Full-course audio report is stale"
    print(json.dumps({key: report[key] for key in (
        "stageLessons", "recordedFieldOccurrences", "batchTextVoiceClips",
        "uniqueExactTextsAcrossBatches", "overlappingExactTexts",
        "overlappingVoicePairsWithDifferentBytes", "listeningReviewed")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
