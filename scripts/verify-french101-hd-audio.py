#!/usr/bin/env python3
"""Verify private French 101 lesson MP3s against current exact draft fixtures."""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from runpy import run_path

GEN = run_path(str(Path(__file__).with_name("generate-french101-hd-audio.py")))
SOURCES = GEN["SOURCES"]
VOICES = GEN["VOICES"]
lesson_source = GEN["lesson_source"]


def verify_lesson(stage, number, folder):
    expected, source_sha, module = lesson_source(stage, number)
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    if (manifest.get("pairKey"), manifest.get("locale"), manifest.get("voices"), manifest.get("scope"),
        manifest.get("sourceFixtureSha256"), manifest.get("listeningReviewed"), manifest.get("registered")) != (
        "French:English", "fr-FR", VOICES, {"stage": stage, "lesson": number, "module": module},
        source_sha, False, False):
        raise ValueError("Manifest identity, source or review state mismatch")
    if set(manifest["clips"]) != set(expected):
        raise ValueError("Missing or extra source text")
    byte_count = 0
    clip_count = 0
    for key, row in expected.items():
        recorded = manifest["clips"][key]
        if {k: recorded.get(k) for k in ("displayText", "spokenText", "fields")} != row:
            raise ValueError(f"Wrong display/spoken text or source fields: {key}")
        if set(recorded["voices"]) != set(VOICES):
            raise ValueError(f"Missing or extra voice: {key}")
        for gender, voice in VOICES.items():
            clip = recorded["voices"][gender]
            name = f"fr-101-{key[:20]}-{gender}.mp3"
            if (clip.get("name"), clip.get("voice"), clip.get("locale"), clip.get("spokenText"),
                clip.get("listeningReviewed")) != (name, voice, "fr-FR", row["spokenText"], False):
                raise ValueError(f"Wrong voice/text/review identity: {key}/{gender}")
            data = (folder / name).read_bytes()
            if len(data) <= 500 or len(data) != clip.get("bytes") or hashlib.sha256(data).hexdigest() != clip.get("sha256"):
                raise ValueError(f"Wrong bytes or SHA-256: {name}")
            probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                    "-of", "default=noprint_wrappers=1:nokey=1", str(folder / name)],
                                   capture_output=True, text=True, check=True)
            seconds = round(float(probe.stdout.strip()), 3)
            if not 0.1 < seconds < 120 or seconds != clip.get("durationSeconds"):
                raise ValueError(f"Wrong MP3 duration: {name}")
            byte_count += len(data)
            clip_count += 1
    return {"stage": stage, "lesson": number, "texts": len(expected), "clips": clip_count,
            "spokenCharacters": sum(len(row["spokenText"]) for row in expected.values()) * 2,
            "bytes": byte_count, "sourceFixtureSha256": source_sha, "listeningReviewed": False}


def verify_stage(stage, output_root, first_folder=None):
    count, _, _ = SOURCES[stage]
    expected = set()
    covered = set()
    reports = []
    for number in range(1, count + 1):
        folder = output_root / (first_folder if number == 1 and first_folder else f"{stage}-{number}")
        report = verify_lesson(stage, number, folder)
        reports.append(report)
        expected.update(lesson_source(stage, number)[0])
        covered.update(json.loads((folder / "manifest.json").read_text())["clips"])
    if expected != covered:
        raise ValueError("Stage source coverage mismatch")
    return {"stage": stage, "lessons": count, "uniqueDisplayTexts": len(expected),
            "distinctDisplayVoicePairs": len(expected) * 2,
            "perLessonClips": sum(r["clips"] for r in reports),
            "spokenCharacters": sum(r["spokenCharacters"] for r in reports),
            "bytes": sum(r["bytes"] for r in reports), "listeningReviewed": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", required=True, choices=SOURCES)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--lesson", type=int)
    parser.add_argument("--first-folder")
    args = parser.parse_args()
    if args.lesson:
        folder = args.output_root / (args.first_folder if args.lesson == 1 and args.first_folder else f"{args.stage}-{args.lesson}")
        result = verify_lesson(args.stage, args.lesson, folder)
    else:
        result = verify_stage(args.stage, args.output_root, args.first_folder)
    print(json.dumps(result, ensure_ascii=False))
