#!/usr/bin/env python3
"""Capped, resumable private fr-FR HD synthesis for French Dinner Core 1–3."""

import argparse
import base64
import hashlib
import json
import os
import runpy
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path


DIR = Path(__file__).resolve().parent
SCOPE = DIR / "private-core-1-3-audio-scope.json"
OUTPUT = Path("/Users/drive/lt-audio/french-travel-dinner/core-1-3")
MANIFEST = OUTPUT / "manifest.json"
VOICES = {"female": "fr-FR-Chirp3-HD-Aoede", "male": "fr-FR-Chirp3-HD-Charon"}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    value = round(float(result.stdout.strip()), 3)
    if not 0.1 < value < 120:
        raise ValueError(f"Invalid MP3 duration: {path.name}")
    return value


def save(value):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    temp = MANIFEST.with_suffix(".json.part")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temp.replace(MANIFEST)


def synthesize(text, voice, project, token):
    payload = {"input": {"text": text},
               "voice": {"languageCode": "fr-FR", "name": voice},
               "audioConfig": {"audioEncoding": "MP3"}}
    request = urllib.request.Request(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json",
                 "x-goog-user-project": project},
    )
    for attempt in range(3):
        try:
            response = json.load(urllib.request.urlopen(request, timeout=75))
            data = base64.b64decode(response["audioContent"])
            if len(data) <= 500:
                raise ValueError("Empty synthesized MP3")
            return data
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise RuntimeError(f"Synthesis HTTP {error.code}") from None
            time.sleep(2 ** attempt)
    raise RuntimeError("Synthesis did not return audio")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True, help="Google quota and billing project")
    parser.add_argument("--generate", action="store_true", help="Perform paid synthesis")
    parser.add_argument("--limit", type=int, default=20, help="Maximum new clips in this invocation")
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        raise SystemExit("--limit must be between 1 and 20")
    os.umask(0o077)
    scope_bytes = SCOPE.read_bytes()
    scope = json.loads(scope_bytes)
    rebuilt_scope = runpy.run_path(str(DIR / "build-private-core-1-3-audio-scope.py"))["build"]()
    if scope != rebuilt_scope:
        raise ValueError("Private audio scope no longer matches current lesson source")
    if (scope.get("pairKey"), scope.get("locale"), scope.get("voices"),
        scope.get("recordingsBundled"), scope.get("listeningReviewed"),
        scope.get("registered"), scope.get("uniqueTexts"), scope.get("proposedClips")) != (
        "French:English", "fr-FR", list(VOICES.values()), False, False, False, 75, 150):
        raise ValueError("Audio scope identity, count, or release gate changed")
    if scope["lessonIds"] != [f"travel-dinner:{n}:fr-en" for n in range(1, 4)]:
        raise ValueError("Core lesson identity changed")
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {
        "schema": 1, "courseId": "travel-dinner", "stageId": "travel-dinner",
        "pairKey": "French:English", "locale": "fr-FR", "quotaProject": args.project,
        "scopeSHA256": digest(scope_bytes), "voices": VOICES,
        "listeningReviewed": False, "registered": False, "clips": {},
    }
    expected = ("travel-dinner", "travel-dinner", "French:English", "fr-FR",
                args.project, digest(scope_bytes), VOICES, False, False)
    actual = tuple(manifest.get(key) for key in (
        "courseId", "stageId", "pairKey", "locale", "quotaProject", "scopeSHA256",
        "voices", "listeningReviewed", "registered"))
    if actual != expected:
        raise ValueError("Existing manifest identity, source, quota project, or review gate changed")
    allowed = {row["textSHA256"] for row in scope["texts"]}
    if set(manifest["clips"]) - allowed:
        raise ValueError("Existing manifest has out-of-scope audio")
    pending = []
    verified = 0
    for row in scope["texts"]:
        text = row["spokenText"]
        key = row["textSHA256"]
        if digest(text.encode("utf-8")) != key:
            raise ValueError("Scope text hash changed")
        entry = manifest["clips"].get(key)
        if entry and (entry.get("spokenText") != text or entry.get("placements") != row["placements"]):
            raise ValueError("Existing clip text or placement changed")
        for gender, voice in VOICES.items():
            name = f"fr-dinner-core-{key[:20]}-{gender}.mp3"
            path = OUTPUT / name
            clip = entry.get("voices", {}).get(gender) if entry else None
            if clip:
                if (clip.get("name"), clip.get("voice"), clip.get("locale"),
                    clip.get("spokenText"), clip.get("listeningReviewed")) != (
                    name, voice, "fr-FR", text, False):
                    raise ValueError("Existing clip identity or review gate changed")
                data = path.read_bytes()
                if (len(data), digest(data), duration(path)) != (
                    clip.get("bytes"), clip.get("sha256"), clip.get("durationSeconds")):
                    raise ValueError("Existing clip bytes or duration changed")
                verified += 1
            else:
                if path.exists():
                    raise ValueError("Unmanifested MP3 exists")
                pending.append((key, row, gender, voice, name))
    planned = pending[:args.limit]
    print(json.dumps({"scopeSHA256": digest(scope_bytes), "verifiedClips": verified,
                      "remainingClips": len(pending), "plannedClips": len(planned),
                      "plannedCharacters": sum(len(row["spokenText"]) for _, row, _, _, _ in planned),
                      "paidSynthesis": args.generate}), flush=True)
    if not args.generate:
        return
    token = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"],
                           capture_output=True, text=True, check=True).stdout.strip()
    for key, row, gender, voice, name in planned:
        data = synthesize(row["spokenText"], voice, args.project, token)
        OUTPUT.mkdir(parents=True, exist_ok=True)
        path = OUTPUT / name
        temp = path.with_suffix(".mp3.part")
        temp.write_bytes(data)
        length = duration(temp)
        temp.replace(path)
        entry = manifest["clips"].setdefault(
            key, {"spokenText": row["spokenText"], "placements": row["placements"], "voices": {}})
        entry["voices"][gender] = {
            "name": name, "voice": voice, "locale": "fr-FR", "spokenText": row["spokenText"],
            "bytes": len(data), "sha256": digest(data), "durationSeconds": length,
            "listeningReviewed": False,
        }
        save(manifest)
    print(json.dumps({"generatedClips": len(planned), "manifest": str(MANIFEST)}), flush=True)


if __name__ == "__main__":
    main()
