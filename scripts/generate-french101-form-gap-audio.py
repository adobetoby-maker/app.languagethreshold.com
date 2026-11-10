#!/usr/bin/env python3
"""Privately synthesize missing French 101 form prompts; never registers playback.

The input is the exact, source-pinned form fixture. Existing lesson recordings are
counted only when their display text matches the prompt exactly. A dry run makes
no network requests and no files. New clips keep their own unreviewed manifest.
"""

import argparse
import base64
import hashlib
import json
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / "content/french-basics"
DEFAULT_OUTPUT = Path("/Users/drive/lt-audio/french-101/form-practice-gap")
LESSON_AUDIO = Path("/Users/drive/lt-audio/french-101")
SECTIONS = ("foundation-1-10", "core-1-3", "core-4-6", "core-7-9", "core-10-12", "core-13-18", "core-19-30", "master-1-20")
VOICES = {"female": "fr-FR-Chirp3-HD-Aoede", "male": "fr-FR-Chirp3-HD-Charon"}


def load(path):
    return json.loads(path.read_text())


def digest(data):
    return hashlib.sha256(data).hexdigest()


def duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    value = float(result.stdout.strip())
    if value <= 0:
        raise ValueError(f"Nonpositive duration: {path}")
    return round(value, 3)


def source_inventory():
    prompts = {}
    fixture_hashes = {}
    for section in SECTIONS:
        path = FIXTURES / f"private-form-practice-{section}-fr-en.json"
        raw = path.read_bytes()
        fixture_hashes[path.name] = digest(raw)
        fixture = json.loads(raw)
        if fixture["pairKey"] != "French:English" or fixture["reviewed"] or fixture["registered"]:
            raise ValueError(f"Unexpected pair or release gate: {path}")
        stage = section.split("-")[0]
        for lesson in fixture["lessons"]:
            number = lesson["lesson"]
            manifest_path = LESSON_AUDIO / f"{stage}-{number}" / "manifest.json"
            if not manifest_path.exists():
                manifest_path = LESSON_AUDIO / f"{stage}-{number}-complete" / "manifest.json"
            manifest = load(manifest_path)
            if manifest["locale"] != "fr-FR":
                raise ValueError(f"Wrong locale: {manifest_path}")
            covered = {entry.get("displayText", key) for key, entry in manifest["clips"].items()}
            for prompt in lesson["prompts"]:
                text = prompt.get("audioDisplayText", prompt["frenchAnswer"])
                if text not in covered:
                    prompts.setdefault(text, []).append({"id": prompt["id"], "stage": stage, "lesson": number})
    return prompts, fixture_hashes


def valid_clip(path, text, gender, old):
    if not old or old.get("spokenText") != text or old.get("voice") != VOICES[gender] or old.get("locale") != "fr-FR":
        return False
    if not path.is_file() or path.stat().st_size <= 500:
        return False
    if digest(path.read_bytes()) != old.get("sha256"):
        return False
    return duration(path) > 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--reconcile-source-hashes", action="store_true",
                        help="Repin changed fixture hashes only when all exact prompt placements and both existing clips still match")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--rpm", type=int, default=90)
    args = parser.parse_args()
    if args.rpm < 1 or args.limit is not None and args.limit < 1:
        parser.error("rpm and limit must be positive")
    missing, fixture_hashes = source_inventory()
    old_path = args.output / "manifest.json"
    old = load(old_path) if old_path.exists() else {}
    if args.reconcile_source_hashes:
        if not old or old.get('pairKey') != 'French:English' or old.get('scope') != 'private-form-practice-gap' or old.get('registered') is not False or old.get('listeningReviewed') is not False:
            raise ValueError('Only an existing private, unreviewed French form-gap manifest can be reconciled')
        if old.get('promptPlacements') != missing or set(old.get('clips', {})) != set(missing):
            raise ValueError('Current form prompt placements or spoken texts changed; reconciliation is unsafe')
        for text in missing:
            for gender in VOICES:
                clip = old['clips'][text].get(gender)
                if not clip or not valid_clip(args.output / clip['name'], text, gender, clip):
                    raise ValueError(f'Existing form clip failed exact text, voice, hash or duration: {text} / {gender}')
        old['fixtureSHA256'] = fixture_hashes
        temp_manifest = old_path.with_suffix('.json.part')
        temp_manifest.write_text(json.dumps(old, ensure_ascii=False, indent=2) + '\n')
        temp_manifest.replace(old_path)
        print(json.dumps({'reconciledFixtureHashes': len(fixture_hashes), 'verifiedClips': len(missing) * 2,
                          'newClips': 0, 'registered': False, 'listeningReviewed': False}))
        return
    if old and (old.get("fixtureSHA256") != fixture_hashes or set(old.get("clips", {})) - set(missing)):
        raise ValueError("Existing manifest does not match current exact-text fixture inventory")
    clips = old.get("clips", {})
    jobs = []
    for text in missing:
        key = digest(text.encode())
        entry = clips.get(text, {})
        for gender in VOICES:
            name = f"fr-101-form-{key[:20]}-{gender}.mp3"
            path = args.output / name
            if not valid_clip(path, text, gender, entry.get(gender)):
                jobs.append((text, gender, name, path))
    report = {"uniqueTexts": len(missing), "requiredClips": len(missing) * 2,
              "existingValidatedClips": len(missing) * 2 - len(jobs), "pendingClips": len(jobs),
              "pendingCharacters": sum(len(text) for text, _, _, _ in jobs),
              "locale": "fr-FR", "voices": VOICES, "registered": False, "listeningReviewed": False}
    print(json.dumps(report, ensure_ascii=False), flush=True)
    if args.dry_run:
        return
    if not args.project:
        parser.error("--project required for synthesis")
    args.output.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"], capture_output=True, text=True, check=True).stdout.strip()
    if not token:
        raise RuntimeError("No ADC access token")
    next_request = 0.0
    completed = 0
    for text, gender, name, path in jobs[:args.limit]:
        if shutil.disk_usage(args.output).free < 200_000_000:
            raise RuntimeError("Less than 200 MB free disk space")
        wait = next_request - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        next_request = time.monotonic() + 60 / args.rpm
        payload = {"input": {"text": text}, "voice": {"languageCode": "fr-FR", "name": VOICES[gender]},
                   "audioConfig": {"audioEncoding": "MP3"}}
        request = urllib.request.Request(
            "https://texttospeech.googleapis.com/v1/text:synthesize", data=json.dumps(payload).encode(),
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", "x-goog-user-project": args.project},
        )
        for attempt in range(5):
            try:
                response = json.load(urllib.request.urlopen(request, timeout=75))
                data = base64.b64decode(response["audioContent"])
                if len(data) <= 500:
                    raise ValueError("Empty audio")
                temp = path.with_suffix(".part")
                temp.write_bytes(data)
                clip_duration = duration(temp)
                temp.replace(path)
                clips.setdefault(text, {})[gender] = {
                    "name": name, "voice": VOICES[gender], "locale": "fr-FR", "spokenText": text,
                    "bytes": len(data), "durationSeconds": clip_duration, "sha256": digest(data), "listeningReviewed": False,
                }
                old = {"schema": 1, "pairKey": "French:English", "scope": "private-form-practice-gap",
                       "fixtureSHA256": fixture_hashes, "registered": False, "listeningReviewed": False,
                       "project": args.project, "voices": VOICES, "promptPlacements": missing, "clips": clips}
                temp_manifest = old_path.with_suffix(".json.part")
                temp_manifest.write_text(json.dumps(old, ensure_ascii=False, indent=2) + "\n")
                temp_manifest.replace(old_path)
                completed += 1
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 4:
                    raise RuntimeError(f"Synthesis HTTP {error.code}") from error
                time.sleep(2 ** attempt)
        if completed % 20 == 0:
            print(f"Validated {completed} new clips", flush=True)
    print(json.dumps({"newClips": completed, "remainingClips": len(jobs) - completed}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
