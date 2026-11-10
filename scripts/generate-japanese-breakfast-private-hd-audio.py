#!/usr/bin/env python3
"""Synthesize exact-source Japanese Breakfast draft audio to a private directory.

Default is a dry run. No recording is marked listened to or registered.
"""

import argparse
import base64
import hashlib
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from runpy import run_path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-travel-breakfast"
INVENTORY = CONTENT / "private-audio-scope-ja-en.json"
OUTPUT = Path("/Users/drive/lt-audio/japanese-travel-breakfast/full-course-2026-11-09")
VOICES = {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def source():
    expected = run_path(str(ROOT / "scripts/build-japanese-travel-breakfast-audio-scope.py"))["build"]()
    raw = INVENTORY.read_bytes()
    if raw != expected.encode():
        raise ValueError("Private inventory differs from exact current source files")
    value = json.loads(raw)
    if (value.get("pairKey"), value.get("locale"), value.get("reviewed"),
        value.get("registered"), value.get("listeningReviewed"), value.get("voices"),
        value.get("counts", {}).get("lessons")) != (
        "Japanese:English", "ja-JP", False, False, False, VOICES, 60):
        raise ValueError("Private source identity or review state changed")
    rows = value["texts"]
    if len(rows) != value["counts"]["uniqueExactTexts"] or len(rows) != 1180:
        raise ValueError("Unexpected private source coverage")
    if sha("\n".join(r["text"] for r in rows).encode()) != value["exactTextSha256"]:
        raise ValueError("Aggregate text hash changed")
    if any(sha(r["text"].encode()) != r["sha256"] for r in rows):
        raise ValueError("Exact text hash changed")
    return value, sha(raw)


def duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    seconds = round(float(result.stdout.strip()), 3)
    if not 0.1 < seconds < 120:
        raise ValueError(f"Invalid MP3 duration: {path.name}")
    return seconds


def save(path, value):
    temporary = path.with_suffix(".json.part")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project")
    parser.add_argument("--generate", action="store_true")
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        raise SystemExit("--limit must be 1–20 new clips")
    if args.generate and not args.project:
        raise SystemExit("Paid synthesis requires --project")
    os.umask(0o077)
    inventory, source_sha = source()
    manifest_path = OUTPUT / "manifest.json"
    identity = {"schema": 1, "state": "private-unreviewed-full-course-recordings",
                "pairKey": "Japanese:English", "locale": "ja-JP", "voices": VOICES,
                "sourceInventorySha256": source_sha,
                "exactTextSha256": inventory["exactTextSha256"],
                "sourceSha256": inventory["sourceSha256"], "textReviewed": False,
                "listeningReviewed": False, "registered": False}
    manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {**identity, "clips": {}}
    if any(manifest.get(key) != value for key, value in identity.items()):
        raise ValueError("Existing manifest source, pair, voice or review state changed")
    expected_keys = {r["sha256"] for r in inventory["texts"]}
    if set(manifest["clips"]) - expected_keys:
        raise ValueError("Existing manifest has out-of-scope text")
    jobs = []
    for row in inventory["texts"]:
        recorded = manifest["clips"].get(row["sha256"], {})
        if recorded and recorded.get("text") != row["text"]:
            raise ValueError("Existing manifest text changed")
        for gender, voice in VOICES.items():
            name = f"ja-breakfast-{row['sha256'][:20]}-{gender}.mp3"
            clip = recorded.get("voices", {}).get(gender)
            path = OUTPUT / name
            if clip and path.is_file() and (clip.get("name"), clip.get("voice"),
                    clip.get("text"), clip.get("listeningReviewed")) == (name, voice, row["text"], False):
                data = path.read_bytes()
                if len(data) == clip.get("bytes") and sha(data) == clip.get("sha256"):
                    continue
            jobs.append((row, gender, voice, name))
    batch = jobs[:args.limit]
    print(json.dumps({"inventoryTexts": len(inventory["texts"]), "existingClips": 2360-len(jobs),
                      "remainingClips": len(jobs), "plannedClips": len(batch),
                      "plannedCharacters": sum(len(r[0]["text"]) for r in batch),
                      "paidSynthesis": args.generate}, ensure_ascii=False), flush=True)
    if not args.generate:
        return
    OUTPUT.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"],
                           capture_output=True, text=True, check=True).stdout.strip()
    for row, gender, voice, name in batch:
        payload = {"input": {"text": row["text"]},
                   "voice": {"languageCode": "ja-JP", "name": voice},
                   "audioConfig": {"audioEncoding": "MP3"}}
        request = urllib.request.Request("https://texttospeech.googleapis.com/v1/text:synthesize",
            data=json.dumps(payload, ensure_ascii=False).encode(),
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json",
                     "x-goog-user-project": args.project})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=75) as response:
                    data = base64.b64decode(json.load(response)["audioContent"])
                if len(data) <= 500:
                    raise ValueError("Empty MP3")
                path = OUTPUT / name
                temporary = path.with_suffix(".part")
                temporary.write_bytes(data)
                seconds = duration(temporary)
                temporary.replace(path)
                item = manifest["clips"].setdefault(row["sha256"],
                    {"text": row["text"], "occurrences": row["occurrences"], "voices": {}})
                item["voices"][gender] = {"name": name, "text": row["text"], "voice": voice,
                    "locale": "ja-JP", "sha256": sha(data), "bytes": len(data),
                    "durationSeconds": seconds, "listeningReviewed": False}
                save(manifest_path, manifest)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f"Synthesis HTTP {error.code}") from None
                time.sleep(2 ** attempt)
    print(json.dumps({"generatedClips": len(batch), "manifest": str(manifest_path)}), flush=True)


if __name__ == "__main__":
    main()
