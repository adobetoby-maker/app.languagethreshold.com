"""Fail closed on a private Japanese 101 lesson audio batch.

Checks exact current lesson text, locale, voices, bytes, SHA-256, duration and
the unreviewed state. It does not listen to recordings or publish them.
"""

import argparse
import hashlib
import json
import subprocess
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICES = {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"}


def normalized(value):
    return " ".join(unicodedata.normalize("NFC", value).strip().split()).lower()


def spoken(value):
    return "".join(unicodedata.normalize("NFC", value).split())


def verify(module, number, folder):
    if module not in ("foundation-japanese-basics", "japanese-basics", "master-japanese-basics"):
        raise ValueError("Unsupported Japanese 101 module")
    source = json.loads((ROOT / "public/lesson-content/ja" / f"{module}.json").read_text(encoding="utf-8"))
    if source.get("language") != "Japanese" or source.get("nativeLanguage") != "English":
        raise ValueError("Wrong source language pair")
    lesson = source["lessons"][str(number)]
    values = [*lesson["passage"]["target"], *(word["es"] for word in lesson["words"])]
    expected = {normalized(value): spoken(value) for value in values}
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    inventory = json.loads((ROOT / "docs/japanese-program/audio-inventory.json").read_text(encoding="utf-8"))
    if manifest.get("scope") != {"module": module, "lesson": number}:
        raise ValueError("Wrong lesson scope")
    if manifest.get("sourceSHA256") != inventory["normalizedTextSHA256"]:
        raise ValueError("Stale source inventory")
    if manifest.get("locale") != "ja-JP" or manifest.get("voices") != VOICES:
        raise ValueError("Wrong locale or voice identity")
    if manifest.get("listeningReviewed") is not False:
        raise ValueError("Unreviewed batch incorrectly marked accepted")
    if set(manifest["clips"]) != set(expected):
        raise ValueError("Missing or extra source text")
    bytes_total = 0
    durations = []
    for key, voices in manifest["clips"].items():
        if set(voices) != set(VOICES):
            raise ValueError(f"Missing or extra voice for {key}")
        for gender, clip in voices.items():
            name = "ja-101-" + hashlib.sha256(key.encode()).hexdigest()[:20] + "-" + gender + ".mp3"
            if clip.get("name") != name or clip.get("voice") != VOICES[gender] or clip.get("locale") != "ja-JP":
                raise ValueError(f"Wrong clip identity: {key}/{gender}")
            if clip.get("spokenText") != expected[key] or clip.get("listeningReviewed") is not False:
                raise ValueError(f"Wrong text or review state: {key}/{gender}")
            path = folder / name
            data = path.read_bytes()
            if len(data) <= 500 or len(data) != clip.get("bytes"):
                raise ValueError(f"Wrong byte count: {name}")
            if hashlib.sha256(data).hexdigest() != clip.get("sha256"):
                raise ValueError(f"Wrong SHA-256: {name}")
            probe = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
                check=True, capture_output=True, text=True,
            )
            duration = round(float(probe.stdout.strip()), 3)
            if not 0.1 < duration < 120 or duration != clip.get("durationSeconds"):
                raise ValueError(f"Wrong duration: {name}")
            bytes_total += len(data)
            durations.append(duration)
    return {"module": module, "lesson": number, "texts": len(expected), "clips": len(durations),
            "spokenCharacters": sum(len(value) for value in expected.values()) * len(VOICES),
            "bytes": bytes_total, "durationSecondsMin": min(durations), "durationSecondsMax": max(durations),
            "sourceSHA256": manifest["sourceSHA256"], "listeningReviewed": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", required=True)
    parser.add_argument("--lesson", required=True, type=int)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(verify(args.module, args.lesson, args.output), ensure_ascii=False))
