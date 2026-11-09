#!/usr/bin/env python3
"""Audit the private Japanese Breakfast MP3 set against exact current source."""

import argparse
import json
from pathlib import Path
from runpy import run_path

GEN = run_path(str(Path(__file__).with_name("generate-japanese-breakfast-private-hd-audio.py")))
OUTPUT = GEN["OUTPUT"]
VOICES = GEN["VOICES"]
sha = GEN["sha"]
duration = GEN["duration"]
source = GEN["source"]


def verify(allow_partial=False):
    inventory, inventory_sha = source()
    manifest = json.loads((OUTPUT / "manifest.json").read_text())
    identity = {"schema": 1, "state": "private-unreviewed-full-course-recordings",
                "pairKey": "Japanese:English", "locale": "ja-JP", "voices": VOICES,
                "sourceInventorySha256": inventory_sha,
                "exactTextSha256": inventory["exactTextSha256"],
                "sourceSha256": inventory["sourceSha256"], "textReviewed": False,
                "listeningReviewed": False, "registered": False}
    if any(manifest.get(key) != value for key, value in identity.items()):
        raise ValueError("Manifest source, pair, voice or review state mismatch")
    rows = {row["sha256"]: row for row in inventory["texts"]}
    if not set(manifest["clips"]) <= set(rows):
        raise ValueError("Manifest has out-of-scope text")
    if not allow_partial and set(manifest["clips"]) != set(rows):
        raise ValueError("Missing exact source texts")
    clips = 0
    bytes_ = 0
    characters = 0
    for key, recorded in manifest["clips"].items():
        row = rows[key]
        if recorded.get("text") != row["text"] or recorded.get("occurrences") != row["occurrences"]:
            raise ValueError(f"Source text or occurrence mismatch: {key}")
        if not set(recorded["voices"]) <= set(VOICES):
            raise ValueError(f"Unexpected voice: {key}")
        if not allow_partial and set(recorded["voices"]) != set(VOICES):
            raise ValueError(f"Missing voice: {key}")
        for gender, clip in recorded["voices"].items():
            name = f"ja-breakfast-{key[:20]}-{gender}.mp3"
            if (clip.get("name"), clip.get("text"), clip.get("voice"), clip.get("locale"),
                clip.get("listeningReviewed")) != (name, row["text"], VOICES[gender], "ja-JP", False):
                raise ValueError(f"Clip identity or review mismatch: {key}/{gender}")
            path = OUTPUT / name
            data = path.read_bytes()
            if len(data) <= 500 or len(data) != clip.get("bytes") or sha(data) != clip.get("sha256"):
                raise ValueError(f"MP3 byte/hash mismatch: {name}")
            if duration(path) != clip.get("durationSeconds"):
                raise ValueError(f"MP3 duration mismatch: {name}")
            clips += 1
            bytes_ += len(data)
            characters += len(row["text"])
    if not allow_partial and clips != 2360:
        raise ValueError("Incomplete two-voice course")
    return {"lessons": 60, "sourceTexts": len(rows), "recordedTexts": len(manifest["clips"]),
            "clips": clips, "spokenCharacters": characters, "bytes": bytes_,
            "sourceInventorySha256": inventory_sha, "listeningReviewed": False,
            "registered": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--allow-partial", action="store_true")
    args = parser.parse_args()
    print(json.dumps(verify(args.allow_partial), ensure_ascii=False))
