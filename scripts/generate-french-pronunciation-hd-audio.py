#!/usr/bin/env python3
"""Generate resumable private fr-FR HD audio from a pinned draft inventory."""

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

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "content/french-pronunciation/private-audio-scope-fr-en.json"
DEFAULT_OUTPUT = Path("/Users/drive/lt-audio/french-pronunciation/private-f1-c6-2026-11-10")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def duration_seconds(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    duration = round(float(result.stdout.strip()), 3)
    if not 0.1 < duration < 120:
        raise ValueError(f"Invalid MP3 duration: {path.name}")
    return duration


def atomic_json(path, value):
    part = path.with_suffix(".json.part")
    part.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    part.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", type=Path, default=INVENTORY)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--project", help="Google quota/billing project; required for paid synthesis")
    parser.add_argument("--generate", action="store_true", help="Issue paid Cloud TTS requests")
    parser.add_argument("--limit", type=int, default=20, help="Maximum new clips this run (1–20)")
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        parser.error("--limit must be 1–20")
    if args.generate and not args.project:
        parser.error("--project is required with --generate")

    inventory = json.loads(args.inventory.read_text())
    if (inventory["pairKey"], inventory["locale"], inventory["state"]) != (
        "French:English", "fr-FR", "private-audio-scope-unsynthesized"
    ):
        raise ValueError("Inventory identity mismatch")
    if any(inventory[gate] for gate in ("reviewed", "registered", "recordingsGenerated", "listeningReviewed")):
        raise ValueError("Inventory release/listening state changed")
    for source in inventory["sourceFiles"]:
        if sha((ROOT / source["path"]).read_bytes()) != source["sha256"]:
            raise ValueError(f"Source file changed: {source['path']}")
    texts = [row["text"] for row in inventory["texts"]]
    if sha("\n".join(texts).encode("utf-8")) != inventory["exactTextSha256"]:
        raise ValueError("Inventory text fingerprint mismatch")
    if len(texts) != len(set(texts)) or len(texts) != inventory["counts"]["uniqueExactTexts"]:
        raise ValueError("Inventory text count mismatch")
    voices = inventory["voices"]
    if voices != {"female": "fr-FR-Chirp3-HD-Aoede", "male": "fr-FR-Chirp3-HD-Charon"}:
        raise ValueError("Voice identity mismatch")

    os.umask(0o077)
    manifest_path = args.output / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {
        "schema": 1, "pairKey": "French:English", "locale": "fr-FR", "voices": voices,
        "sourceExactTextSha256": inventory["exactTextSha256"],
        "quotaProject": args.project if args.generate else None,
        "listeningReviewed": False, "registered": False, "clips": {},
    }
    if (manifest["pairKey"], manifest["locale"], manifest["voices"], manifest["sourceExactTextSha256"]) != (
        "French:English", "fr-FR", voices, inventory["exactTextSha256"]
    ) or manifest["listeningReviewed"] is not False or manifest["registered"] is not False:
        raise ValueError("Existing manifest identity or review state mismatch")
    if args.generate and manifest["quotaProject"] not in (None, args.project):
        raise ValueError("Existing manifest uses a different quota project")

    pending = []
    for row in inventory["texts"]:
        text = row["text"]
        if sha(text.encode("utf-8")) != row["sha256"]:
            raise ValueError("Text hash mismatch")
        key = row["sha256"]
        for gender, voice in voices.items():
            name = f"fr-pronunciation-{key[:24]}-{gender}.mp3"
            clip = manifest["clips"].get(key, {}).get(gender)
            path = args.output / name
            if clip:
                if (clip["name"], clip["voice"], clip["spokenText"], clip["locale"]) != (name, voice, text, "fr-FR"):
                    raise ValueError("Existing clip identity mismatch")
                if not path.is_file() or sha(path.read_bytes()) != clip["sha256"] or duration_seconds(path) != clip["durationSeconds"]:
                    raise ValueError(f"Existing clip failed file verification: {name}")
                continue
            if path.exists():
                raise ValueError(f"Untracked clip file: {name}")
            pending.append((key, text, gender, voice, name))

    planned = pending[:args.limit]
    print(json.dumps({
        "totalRequiredClips": len(texts) * 2, "existingVerifiedClips": len(texts) * 2 - len(pending),
        "pendingClips": len(pending), "plannedClips": len(planned),
        "plannedCharacters": sum(len(item[1]) for item in planned), "paidSynthesis": args.generate,
    }), flush=True)
    if not args.generate or not planned:
        return
    args.output.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(
        ["gcloud", "auth", "application-default", "print-access-token"],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    manifest["quotaProject"] = args.project
    for key, text, gender, voice, name in planned:
        payload = {
            "input": {"text": text}, "voice": {"languageCode": "fr-FR", "name": voice},
            "audioConfig": {"audioEncoding": "MP3"},
        }
        request = urllib.request.Request(
            "https://texttospeech.googleapis.com/v1/text:synthesize",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", "x-goog-user-project": args.project},
        )
        for attempt in range(3):
            try:
                response = json.load(urllib.request.urlopen(request, timeout=75))
                audio = base64.b64decode(response["audioContent"])
                if len(audio) <= 500:
                    raise ValueError("Empty MP3 response")
                path = args.output / name
                part = path.with_suffix(".part")
                part.write_bytes(audio)
                duration = duration_seconds(part)
                part.replace(path)
                manifest["clips"].setdefault(key, {})[gender] = {
                    "name": name, "voice": voice, "locale": "fr-FR", "spokenText": text,
                    "bytes": len(audio), "durationSeconds": duration, "sha256": sha(audio),
                    "listeningReviewed": False,
                }
                atomic_json(manifest_path, manifest)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f"Synthesis HTTP {error.code}") from None
                time.sleep(2 ** attempt)
    print(json.dumps({"generatedClips": len(planned), "manifest": str(manifest_path)}), flush=True)


if __name__ == "__main__":
    main()
