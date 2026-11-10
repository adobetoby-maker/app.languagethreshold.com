#!/usr/bin/env python3
"""Verify every private Japanese 101 lesson recording against current lesson text.

Read-only: this never changes audio, review decisions, or course registration.
"""

import argparse
import concurrent.futures
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGES = (
    ("foundation", "foundation-japanese-basics", 10),
    ("core", "japanese-basics", 30),
    ("master", "master-japanese-basics", 20),
)
VOICES = {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def normalized(text):
    import unicodedata
    return " ".join(unicodedata.normalize("NFC", text).strip().split()).lower()


def spoken(text):
    import unicodedata
    return "".join(unicodedata.normalize("NFC", text).split())


def measured_duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
         "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return round(float(result.stdout.strip()), 3)


def verify_file(job):
    path, record = job
    data = path.read_bytes()
    require(len(data) == record["bytes"], f"Byte count changed: {path}")
    require(hashlib.sha256(data).hexdigest() == record["sha256"], f"Hash changed: {path}")
    duration = measured_duration(path)
    require(0.1 < duration < 120, f"Invalid duration: {path}")
    require(duration == record["durationSeconds"], f"Duration changed: {path}")
    return len(data)


def verify(audio_root):
    inventory = json.loads((ROOT / "docs/japanese-program/audio-inventory.json").read_text())
    source_entries = {}
    jobs = []
    lesson_count = 0
    occurrences = 0
    reviewed_lessons = 0
    manifest_fingerprints = []
    for stage, module, count in STAGES:
        source = json.loads((ROOT / "public/lesson-content/ja" / f"{module}.json").read_text())
        require(source["language"] == "Japanese" and source["nativeLanguage"] == "English", f"Wrong pair: {module}")
        require(source["module"] == module and len(source["lessons"]) == count, f"Wrong stage source: {module}")
        for number in range(1, count + 1):
            lesson = source["lessons"][str(number)]
            displayed = set(lesson["passage"]["target"] + [word["es"] for word in lesson["words"]])
            require(all(isinstance(text, str) and text.strip() for text in displayed), f"Empty text: {stage} {number}")
            for text in displayed:
                source_entries.setdefault(normalized(text), spoken(text))
            directory = audio_root / ("foundation-1-complete" if stage == "foundation" and number == 1 else f"{stage}-{number}")
            manifest = json.loads((directory / "manifest.json").read_text())
            require(manifest["schema"] == 1 and manifest["locale"] == "ja-JP", f"Wrong locale: {directory}")
            require(manifest["voices"] == VOICES, f"Wrong voices: {directory}")
            require(manifest["scope"] == {"module": module, "lesson": number}, f"Wrong scope: {directory}")
            require(isinstance(manifest.get("listeningReviewed"), bool), f"Missing listening state: {directory}")
            require(manifest.get("registered") is not True, f"Unexpected registration: {directory}")
            require(set(manifest["clips"]) == displayed, f"Text coverage differs: {stage} {number}")
            manifest_fingerprints.append(manifest["sourceSHA256"])
            reviewed_lessons += manifest["listeningReviewed"]
            lesson_count += 1
            for text, variants in manifest["clips"].items():
                require(set(variants) == set(VOICES), f"Voice coverage differs: {stage} {number} {text}")
                key = normalized(text)
                for gender, voice in VOICES.items():
                    record = variants[gender]
                    name = f"ja-101-{hashlib.sha256(key.encode()).hexdigest()[:20]}-{gender}.mp3"
                    require(record["name"] == name and record["voice"] == voice, f"Wrong clip identity: {directory / name}")
                    require(record["locale"] == "ja-JP" and record["spokenText"] == spoken(text), f"Wrong synthesis text: {directory / name}")
                    require(record.get("listeningReviewed") is not True or manifest["listeningReviewed"] is True,
                            f"Clip approved without lesson approval: {directory / name}")
                    jobs.append((directory / name, record))
                    occurrences += 1
    fingerprint = hashlib.sha256(json.dumps(source_entries, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    require(fingerprint == inventory["normalizedTextSHA256"], "Source text fingerprint changed")
    require(len(source_entries) == inventory["uniqueTexts"], "Unique source text count changed")
    require(all(value == fingerprint for value in manifest_fingerprints), "Manifest source fingerprint changed")
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        byte_counts = list(pool.map(verify_file, jobs))
    return {
        "pairKey": "Japanese:English", "locale": "ja-JP", "sourceTextSHA256": fingerprint,
        "lessons": lesson_count, "uniqueTexts": len(source_entries), "recordedClipOccurrences": occurrences,
        "bytesVerified": sum(byte_counts), "listeningReviewedLessons": reviewed_lessons,
        "releaseReady": False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-root", type=Path, default=Path("/Users/drive/lt-audio/japanese-101"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = verify(args.audio_root)
    text = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(text)
    print(text, end="")


if __name__ == "__main__":
    main()
