#!/usr/bin/env python3
"""Dry-run or synthesize a bounded private Chirp 3 HD inventory batch.

Paid runs require a quota project and an exact-text SHA-256. An unreviewed draft
pilot has a separate ten-clip gate. This tool never publishes recordings.
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

VOICES = {
    "ja-JP": {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"},
    "fr-FR": {"female": "fr-FR-Chirp3-HD-Aoede", "male": "fr-FR-Chirp3-HD-Charon"},
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def duration_seconds(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    duration = float(result.stdout.strip())
    if not 0.1 < duration < 120:
        raise ValueError(f"Invalid MP3 duration: {path.name}")
    return round(duration, 3)


def save(path, value):
    temporary = path.with_suffix(".part")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--project", help="Google Cloud billing/quota project")
    parser.add_argument("--approved-sha256", help="reviewed inventory exactTextSha256")
    parser.add_argument("--draft-pilot-sha256", help="unreviewed, source-pinned pilot exactTextSha256")
    parser.add_argument("--generate", action="store_true")
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        raise SystemExit("--limit must be 1–20 clips per paid run")
    inventory = json.loads(args.inventory.read_text())
    locale = inventory["locale"]
    if locale not in VOICES or inventory["pairKey"] not in ("Japanese:English", "French:English"):
        raise SystemExit("Unsupported exact language pair or voice locale")
    if (locale == "ja-JP") != (inventory["pairKey"] == "Japanese:English"):
        raise SystemExit("Pair and voice locale mismatch")
    voices = VOICES[locale]
    rows = inventory["texts"]
    if len(rows) != inventory["counts"]["uniqueExactTexts"]:
        raise SystemExit("Inventory count mismatch")
    if digest("\n".join(row["text"] for row in rows).encode()) != inventory["exactTextSha256"]:
        raise SystemExit("Inventory aggregate text hash mismatch")
    if any(digest(row["text"].encode()) != row["sha256"] for row in rows):
        raise SystemExit("Inventory row text hash mismatch")
    draft_pilot = args.draft_pilot_sha256 is not None
    if args.approved_sha256 and draft_pilot:
        raise SystemExit("Choose reviewed synthesis or an unreviewed draft pilot")
    if args.generate:
        if not args.project:
            raise SystemExit("Paid synthesis requires --project")
        if draft_pilot:
            if args.draft_pilot_sha256 != inventory["exactTextSha256"] \
                    or inventory.get("state") != "private-audio-pilot-unsynthesized" \
                    or inventory.get("reviewed") is not False \
                    or len(rows) > 5 or args.limit > 10:
                raise SystemExit("Unreviewed draft pilot requires exact hash, five texts and ten-clip cap")
        elif args.approved_sha256 != inventory["exactTextSha256"] or inventory.get("reviewed") is not True:
            raise SystemExit("Reviewed synthesis requires a reviewed inventory and exact --approved-sha256")
    os.umask(0o077)
    path = args.output / "manifest.json"
    manifest = json.loads(path.read_text()) if path.is_file() else {
        "schema": 1, "state": "private-unreviewed-recordings", "locale": locale,
        "pairKey": inventory["pairKey"], "exactTextSha256": inventory["exactTextSha256"],
        "voices": voices, "textReviewed": not draft_pilot,
        "listeningReviewed": False, "clips": {},
    }
    if any(manifest.get(k) != v for k, v in (("locale", locale), ("pairKey", inventory["pairKey"]),
                 ("exactTextSha256", inventory["exactTextSha256"]), ("voices", voices))):
        raise SystemExit("Existing manifest source, pair, or voice mismatch")
    jobs = []
    for row in rows:
        for gender, voice in voices.items():
            name = f"{locale}-{row['sha256'][:20]}-{gender}.mp3"
            clip = manifest["clips"].get(row["sha256"], {}).get(gender)
            file = args.output / name
            if clip and file.is_file() and clip.get("name") == name and clip.get("voice") == voice \
                    and clip.get("text") == row["text"] and clip.get("sha256") == digest(file.read_bytes()) \
                    and clip.get("durationSeconds") == duration_seconds(file):
                continue
            jobs.append((row, gender, voice, name))
    batch = jobs[:args.limit]
    print(json.dumps({"pairKey": inventory["pairKey"], "locale": locale,
                      "inventoryTexts": len(rows), "remainingClips": len(jobs),
                      "plannedClips": len(batch), "plannedCharacters": sum(len(j[0]["text"]) for j in batch),
                      "nominalUSD": round(sum(len(j[0]["text"]) for j in batch) * 0.00003, 4),
                      "paidSynthesis": args.generate}, ensure_ascii=False), flush=True)
    if not args.generate:
        return
    args.output.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"],
                           capture_output=True, text=True, check=True).stdout.strip()
    for row, gender, voice, name in batch:
        payload = {"input": {"text": row["text"]},
                   "voice": {"languageCode": locale, "name": voice},
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
                file = args.output / name
                temporary = file.with_suffix(".part")
                temporary.write_bytes(data)
                seconds = duration_seconds(temporary)
                temporary.replace(file)
                manifest["clips"].setdefault(row["sha256"], {})[gender] = {
                    "name": name, "text": row["text"], "voice": voice, "locale": locale,
                    "sha256": digest(data), "bytes": len(data), "durationSeconds": seconds,
                    "listeningReviewed": False,
                }
                save(path, manifest)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f"Synthesis HTTP {error.code}") from None
                time.sleep(2 ** attempt)
    print(json.dumps({"generatedClips": len(batch), "manifest": str(path)}), flush=True)


if __name__ == "__main__":
    main()
