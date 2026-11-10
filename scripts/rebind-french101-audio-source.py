#!/usr/bin/env python3
"""Rebind private audio to a changed fixture only when every spoken clip is unchanged."""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from runpy import run_path

GEN = run_path(str(Path(__file__).with_name("generate-french101-hd-audio.py")))
lesson_source = GEN["lesson_source"]
VOICES = GEN["VOICES"]


def duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return round(float(result.stdout.strip()), 3)


def rebind(folder, stage, number):
    expected, source_sha, module = lesson_source(stage, number)
    path = folder / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if (manifest.get("pairKey"), manifest.get("locale"), manifest.get("voices"),
        manifest.get("scope"), manifest.get("listeningReviewed"), manifest.get("registered")) != (
        "French:English", "fr-FR", VOICES,
        {"stage": stage, "lesson": number, "module": module}, False, False):
        raise ValueError(f"Identity or review state changed: {path}")
    if set(manifest["clips"]) != set(expected):
        raise ValueError(f"Display strings changed: {path}")
    for key, row in expected.items():
        clip_row = manifest["clips"][key]
        if any(clip_row.get(field) != row[field] for field in ("displayText", "spokenText", "fields")):
            raise ValueError(f"Spoken text or source fields changed: {path}: {key}")
        if set(clip_row["voices"]) != set(VOICES):
            raise ValueError(f"Voice set changed: {path}: {key}")
        for gender, voice in VOICES.items():
            clip = clip_row["voices"][gender]
            audio_path = folder / clip["name"]
            data = audio_path.read_bytes()
            if (clip.get("name") != f"fr-101-{key[:20]}-{gender}.mp3"
                or clip.get("voice") != voice or clip.get("locale") != "fr-FR"
                or clip.get("spokenText") != row["spokenText"]
                or clip.get("listeningReviewed") is not False
                or clip.get("bytes") != len(data)
                or clip.get("sha256") != hashlib.sha256(data).hexdigest()
                or clip.get("durationSeconds") != duration(audio_path)):
                raise ValueError(f"Clip identity or bytes changed: {audio_path}")
    old_sha = manifest["sourceFixtureSha256"]
    if old_sha != source_sha:
        manifest["sourceFixtureSha256"] = source_sha
        temp = path.with_suffix(".json.part")
        temp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temp.replace(path)
    return {"lesson": number, "clips": len(expected) * 2, "oldSourceSha256": old_sha,
            "newSourceSha256": source_sha, "changed": old_sha != source_sha}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-root", type=Path, required=True)
    parser.add_argument("--stage", choices=("foundation", "core", "master"), required=True)
    parser.add_argument("--lesson", type=int)
    args = parser.parse_args()
    count = {"foundation": 10, "core": 30, "master": 20}[args.stage]
    numbers = [args.lesson] if args.lesson else range(1, count + 1)
    reports = []
    for number in numbers:
        if not 1 <= number <= count:
            raise ValueError("Lesson outside stage")
        folder = args.audio_root / (
            "foundation-1-complete" if args.stage == "foundation" and number == 1
            else f"{args.stage}-{number}")
        reports.append(rebind(folder, args.stage, number))
    print(json.dumps({"lessons": len(reports), "changed": sum(r["changed"] for r in reports),
                      "clipsVerified": sum(r["clips"] for r in reports)}, ensure_ascii=False))
