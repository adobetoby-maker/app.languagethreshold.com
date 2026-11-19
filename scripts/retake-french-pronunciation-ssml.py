#!/usr/bin/env python3
"""Try four stubborn single-word Chirp 3 HD clips with bounded SSML input."""

import argparse
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path("/Users/drive/lt-audio/french-pronunciation")
OUTPUT = AUDIO / "ssml-quiet-retakes-2026-11-10"
SOURCE = ROOT / "docs/french-program/fr-001-private-quiet-retakes.json"
PROJECT = "project-91661021-fb2d-4524-b9f"
TARGETS = (("prix", "female"), ("quai", "female"),
           ("temps", "male"), ("tu", "male"))
VOICES = {"female": "fr-FR-Chirp3-HD-Aoede", "male": "fr-FR-Chirp3-HD-Charon"}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def signal(path):
    spec = importlib.util.spec_from_file_location(
        "french_signal", ROOT / "scripts/audit-french-pronunciation-private-audio-signal.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.signal(path)


def save(path, manifest):
    part = path.with_suffix(".json.part")
    part.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    part.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--generate", action="store_true")
    parser.add_argument("--limit", type=int, default=1)
    args = parser.parse_args()
    if not 1 <= args.limit <= 4:
        parser.error("--limit must be between 1 and 4")
    os.umask(0o077)
    source = json.loads(SOURCE.read_text())
    if source["pairKey"] != "French:English" or source["listeningReviewed"] is not False or \
            sorted((item["text"], item["gender"]) for item in source["stillQuietPairs"]) != sorted(TARGETS):
        raise ValueError("The pinned four-word source scope changed")
    source_sha = sha(SOURCE.read_bytes())
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUTPUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {
        "schema": 1, "pairKey": "French:English", "locale": "fr-FR",
        "quotaProject": PROJECT, "sourceQuietRetakeSummarySha256": source_sha,
        "listeningReviewed": False, "registered": False, "clips": {},
    }
    if (manifest.get("pairKey"), manifest.get("locale"), manifest.get("quotaProject"),
        manifest.get("sourceQuietRetakeSummarySha256"), manifest.get("listeningReviewed"),
        manifest.get("registered")) != ("French:English", "fr-FR", PROJECT, source_sha, False, False):
        raise ValueError("Private retake identity or review state changed")
    pending = []
    for text, gender in TARGETS:
        key = sha((text + "\n" + gender).encode())
        voice = VOICES[gender]
        name = f"fr-pronunciation-ssml-{key[:24]}-{gender}.mp3"
        ssml = f'<speak><prosody rate="slow" volume="+6dB">{escape(text)}</prosody></speak>'
        current = manifest["clips"].get(key)
        path = OUTPUT / name
        if current:
            if (current["name"], current["text"], current["voice"], current["ssml"],
                current["listeningReviewed"], current["sha256"]) != (
                name, text, voice, ssml, False, sha(path.read_bytes())):
                raise ValueError(f"Existing private clip changed: {name}")
        else:
            if path.exists():
                raise ValueError(f"Untracked private clip: {name}")
            pending.append((key, name, text, gender, voice, ssml))
    planned = pending[:args.limit]
    print(json.dumps({"scope": len(TARGETS), "existing": len(TARGETS) - len(pending),
                      "planned": len(planned), "billableSsmlCharacters": sum(len(x[5]) for x in planned),
                      "paidSynthesis": args.generate}), flush=True)
    if not args.generate or not planned:
        return
    token = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"],
                           capture_output=True, text=True, check=True).stdout.strip()
    for key, name, text, gender, voice, ssml in planned:
        payload = {"input": {"ssml": ssml}, "voice": {"languageCode": "fr-FR", "name": voice},
                   "audioConfig": {"audioEncoding": "MP3"}}
        request = urllib.request.Request(
            "https://texttospeech.googleapis.com/v1/text:synthesize",
            data=json.dumps(payload).encode(),
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json",
                     "x-goog-user-project": PROJECT})
        for attempt in range(3):
            try:
                response = json.load(urllib.request.urlopen(request, timeout=75))
                raw = base64.b64decode(response["audioContent"])
                if len(raw) <= 500:
                    raise ValueError("Empty MP3 response")
                path = OUTPUT / name
                part = path.with_suffix(".part")
                part.write_bytes(raw)
                metrics = signal(part)
                part.replace(path)
                manifest["clips"][key] = {
                    "name": name, "text": text, "textSha256": sha(text.encode()),
                    "gender": gender, "voice": voice, "ssml": ssml, "ssmlSha256": sha(ssml.encode()),
                    "sha256": sha(raw), "bytes": len(raw), "signal": metrics,
                    "listeningReviewed": False,
                }
                save(manifest_path, manifest)
                print(json.dumps({"text": text, "gender": gender,
                                  "peak": metrics["peak"], "rms": metrics["rms"],
                                  "activeSeconds": metrics["activeSeconds"]}), flush=True)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f"Synthesis HTTP {error.code}") from None
                time.sleep(2 ** attempt)


if __name__ == "__main__":
    main()
