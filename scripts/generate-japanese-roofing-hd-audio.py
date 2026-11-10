#!/usr/bin/env python3
"""Generate bounded private Japanese Roofing Chirp 3 HD recordings.

Dry-run by default. Each paid run synthesizes at most 20 new clips and keeps
unreviewed files outside the repository and learner runtime.
"""

import argparse
import base64
import concurrent.futures
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "content/japanese-roofing/audio-inventory.json"
DEFAULT_OUTPUT = Path("/Users/drive/lt-audio/japanese-roofing/foundation-1")
VOICES = {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"}
PILOT_TEXTS = (
    "おはようございます。",
    "はしご",
    "フルハーネスとロープとハンマーが必要です。",
    "英語の「ladder」は日本語で何と言いますか。",
    "おはようございます。ルイスです。はしごは日本語で何と言いますか。",
)


def duration_seconds(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
         "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    duration = round(float(result.stdout.strip()), 3)
    if not 0.1 < duration < 120:
        raise ValueError(f"Invalid audio duration: {path.name}")
    return duration


def save_json(path, value):
    temporary = path.with_suffix(path.suffix + ".part")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def valid_existing(path, record, text, voice, measure_duration=True):
    if not path.is_file() or not isinstance(record, dict):
        return False
    if record.get("voice") != voice or record.get("locale") != "ja-JP" or record.get("spokenText") != text:
        return False
    data = path.read_bytes()
    return (len(data) == record.get("bytes") and hashlib.sha256(data).hexdigest() == record.get("sha256")
            and (not measure_duration or duration_seconds(path) == record.get("durationSeconds")))


def synthesize(job, token, project):
    text, spoken, gender, voice, name = job
    payload = {"input": {"text": spoken}, "voice": {"languageCode": "ja-JP", "name": voice},
               "audioConfig": {"audioEncoding": "MP3"}}
    request = urllib.request.Request(
        "https://texttospeech.googleapis.com/v1/text:synthesize", data=json.dumps(payload).encode(),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json",
                 "x-goog-user-project": project},
    )
    for attempt in range(3):
        try:
            response = json.load(urllib.request.urlopen(request, timeout=75))
            data = base64.b64decode(response["audioContent"])
            if len(data) <= 500:
                raise ValueError("Empty MP3")
            return job, data
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise RuntimeError(f"Synthesis HTTP {error.code} for {name}") from None
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Synthesis failed for {name}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", help="Google Cloud quota/billing project; required for paid synthesis")
    parser.add_argument("--generate", action="store_true", help="Call the paid synthesis API")
    parser.add_argument("--scope", choices=("pilot", "all"), default="pilot")
    parser.add_argument("--limit", type=int, default=10, help="Maximum new clips this run, 1–20")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        parser.error("--limit must be between 1 and 20")
    if args.generate and not args.project:
        parser.error("--project is required with --generate")

    subprocess.run([sys.executable, str(ROOT / "scripts/audit-japanese-roofing-audio.py"), "--check"],
                   check=True, capture_output=True, text=True)
    inventory_bytes = INVENTORY.read_bytes()
    inventory = json.loads(inventory_bytes)
    if (inventory["target"], inventory["native"], inventory["locale"], inventory["voices"]) != (
            "Japanese", "English", "ja-JP", VOICES):
        raise ValueError("Inventory language or voice identity changed")
    if inventory["registered"] is not False or inventory["listeningReviewed"] is not False:
        raise ValueError("Audio source is no longer a private unreviewed candidate")
    strings = inventory["strings"]
    selected = PILOT_TEXTS if args.scope == "pilot" else tuple(strings)
    if any(text not in strings for text in selected):
        raise ValueError("Selected audio text is absent from the current 60-lesson inventory")
    if args.scope == "pilot" and any("foundation-roofing:1:ja-en" not in strings[text]["lessonIds"] for text in selected):
        raise ValueError("Pilot text moved out of Foundation 1")

    manifest_path = args.output / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {
        "schema": 1, "pairKey": "Japanese:English", "locale": "ja-JP", "voices": VOICES,
        "sourceInventorySHA256": hashlib.sha256(inventory_bytes).hexdigest(),
        "stringsSHA256": inventory["stringsSHA256"], "scope": args.scope,
        "listeningReviewed": False, "registered": False, "clips": {},
    }
    if (manifest["pairKey"], manifest["locale"], manifest["voices"], manifest["scope"],
            manifest["sourceInventorySHA256"], manifest["stringsSHA256"]) != (
            "Japanese:English", "ja-JP", VOICES, args.scope,
            hashlib.sha256(inventory_bytes).hexdigest(), inventory["stringsSHA256"]):
        raise ValueError("Existing manifest does not match current source, scope, or voices")
    if manifest["listeningReviewed"] is not False or manifest["registered"] is not False:
        raise ValueError("Existing manifest has a changed release gate")
    if args.generate and manifest.get("quotaProject") not in (None, args.project):
        raise ValueError("Existing manifest was synthesized under a different quota project")

    jobs = []
    for text in selected:
        spoken = strings[text]["spokenText"]
        for gender, voice in VOICES.items():
            name = f"ja-roofing-{hashlib.sha256(text.encode()).hexdigest()[:20]}-{gender}.mp3"
            path = args.output / name
            record = manifest["clips"].get(text, {}).get(gender)
            # Final listening-sheet verification remeasures every duration. Repeated
            # bounded batches only need the exact bytes and source identity here.
            if valid_existing(path, record, spoken, voice, measure_duration=False):
                continue
            if path.exists() or record:
                raise ValueError(f"Existing clip needs investigation, not automatic replacement: {path}")
            jobs.append((text, spoken, gender, voice, name))
    planned = jobs[:args.limit]
    print(json.dumps({
        "scope": args.scope, "project": args.project if args.generate else None,
        "sourceInventorySHA256": manifest["sourceInventorySHA256"],
        "sourceUniqueTexts": inventory["uniqueDisplayTexts"],
        "sourceProjectedTwoVoiceClips": inventory["requiredTwoVoiceClips"],
        "sourceProjectedCharacters": inventory["spokenCharactersAllVoices"],
        "selectedTexts": len(selected), "remainingClips": len(jobs),
        "plannedClips": len(planned), "plannedCharacters": sum(len(job[1]) for job in planned),
        "paidSynthesis": args.generate,
    }, ensure_ascii=False), flush=True)
    if not args.generate:
        return

    os.umask(0o077)
    args.output.mkdir(parents=True, exist_ok=True)
    if manifest.get("quotaProject") is None:
        manifest["quotaProject"] = args.project
        save_json(manifest_path, manifest)
    token = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"],
                           capture_output=True, text=True, check=True).stdout.strip()
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = []
        for job in planned:
            futures.append(pool.submit(synthesize, job, token, args.project))
            # Google currently documents a 200/minute Chirp 3 project quota.
            # Space starts below that ceiling even while requests overlap.
            time.sleep(0.36)
        for future in concurrent.futures.as_completed(futures):
            try:
                (text, spoken, gender, voice, name), data = future.result()
                path = args.output / name
                temporary = path.with_suffix(path.suffix + ".part")
                temporary.write_bytes(data)
                duration = duration_seconds(temporary)
                temporary.replace(path)
                manifest["clips"].setdefault(text, {})[gender] = {
                    "name": name, "voice": voice, "locale": "ja-JP", "spokenText": spoken,
                    "bytes": len(data), "durationSeconds": duration,
                    "sha256": hashlib.sha256(data).hexdigest(), "listeningReviewed": False,
                }
                save_json(manifest_path, manifest)
            except Exception as error:
                errors.append(error)
    if errors:
        raise RuntimeError(f"{len(errors)} clips failed; successful clips were saved for resume") from errors[0]
    print(json.dumps({"generatedClips": len(planned), "manifest": str(manifest_path)}))


if __name__ == "__main__":
    main()
