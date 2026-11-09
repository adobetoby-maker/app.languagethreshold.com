#!/usr/bin/env python3
"""Generate capped, private French 101 lesson audio from exact draft fixtures.

Default is a dry run. Paid synthesis requires --project and --generate. This
script does not register recordings or change any lesson/review state.
"""

import argparse
import base64
import hashlib
import json
import os
import re
import subprocess
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_ROOT = Path("/Users/drive/lt-audio/french-101")
VOICES = {"female": "fr-FR-Chirp3-HD-Aoede", "male": "fr-FR-Chirp3-HD-Charon"}
SOURCES = {
    "foundation": (10, "private-runtime-foundation-1-10.json", "foundation-french-basics"),
    "core": (30, "private-runtime-core-1-30.json", "french-basics"),
    "master": (20, "private-runtime-master-1-20.json", "master-french-basics"),
}
FOUNDATION_SPEAKERS = {"Claire", "Marc", "Léa", "Paul", "Hugo", "Inès", "Nadia", "Théo", "Sami"}
MASTER_SPEAKERS = {"Professeure", "Élève", "Camarade", "Camille", "Responsable", "Léa",
                   "Noé", "Maya", "Hugo", "Ana", "Agent", "Coordinatrice", "Vendeur",
                   "Nadia", "Serveuse", "Visiteur", "Accueil"}
SPEAKER = re.compile(r"^([^:]{1,32})\s*:\s+(.+)$")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def exact(text):
    if not isinstance(text, str):
        raise TypeError("Audio source text must be a string")
    return " ".join(unicodedata.normalize("NFC", text).split())


def spoken_for_display(stage, display):
    display = exact(display)
    match = SPEAKER.match(display)
    if not match:
        return display
    label = match.group(1).strip()
    if stage == "master" and label == "Courriel":
        return display  # The email heading is content, not a dialogue speaker.
    if (stage == "foundation" and label in FOUNDATION_SPEAKERS) or (
            stage == "master" and label in MASTER_SPEAKERS):
        return match.group(2)
    raise ValueError(f"Unreviewed speaker-label mapping: {label}")


def lesson_source(stage, number):
    count, filename, module = SOURCES[stage]
    if not 1 <= number <= count:
        raise ValueError("Lesson outside stage")
    path = ROOT / "content/french-basics" / filename
    raw = path.read_bytes()
    fixture = json.loads(raw)
    if fixture.get("registered") is not False or fixture.get("reviewed") is not False:
        raise ValueError("Only unregistered, unreviewed private fixtures are supported")
    support = fixture["support"]
    if len(support) != count or [s["n"] for s in support] != list(range(1, count + 1)):
        raise ValueError("Stage lesson identities changed")
    lesson = support[number - 1]
    if lesson["stableLessonKey"] != f"{module}:{number}":
        raise ValueError("Stable lesson key changed")
    entries = {}

    def add(display, spoken, field):
        display, spoken = exact(display), exact(spoken)
        if not display or not spoken:
            raise ValueError(f"Empty target text: {field}")
        key = sha(display.encode())
        previous = entries.get(key)
        if previous and (previous["displayText"] != display or previous["spokenText"] != spoken):
            raise ValueError(f"Conflicting spoken text for {display}")
        if previous:
            previous["fields"].append(field)
        else:
            entries[key] = {"displayText": display, "spokenText": spoken, "fields": [field]}

    for index, card in enumerate(lesson["cards"]):
        if not card.get("target") or not card.get("native"):
            raise ValueError("Card lacks exact target/native pair")
        add(card["target"], spoken_for_display(stage, card["target"]), f"cards[{index}].target")
    reader = lesson["reader"]
    if reader.get("sentences"):
        lines = [(line["target"], line["native"]) for line in reader["sentences"]]
    else:
        lines = list(zip(reader["target"], reader["native"], strict=True))
    for index, (display, native) in enumerate(lines):
        if not native:
            raise ValueError("Reader line lacks native pair")
        spoken = spoken_for_display(stage, display)
        add(display, spoken, f"reader[{index}].target")
    return entries, sha(raw), module


def duration(path):
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                            "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
                           capture_output=True, text=True, check=True)
    value = round(float(probe.stdout.strip()), 3)
    if not 0.1 < value < 120:
        raise ValueError(f"Invalid MP3 duration: {path.name}")
    return value


def save(path, manifest):
    temporary = path.with_suffix(".json.part")
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", required=True, choices=SOURCES)
    parser.add_argument("--lesson", required=True, type=int)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--project")
    parser.add_argument("--generate", action="store_true")
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        raise SystemExit("--limit must be between 1 and 20")
    if args.generate and not args.project:
        raise SystemExit("--project is required with --generate")
    os.umask(0o077)
    entries, source_sha, module = lesson_source(args.stage, args.lesson)
    output = args.output.expanduser().resolve()
    if not output.is_relative_to(PRIVATE_ROOT):
        raise ValueError("Unreviewed audio must remain in the French 101 private root")
    if output == PRIVATE_ROOT / "foundation-1":
        raise ValueError("The owner-accepted Foundation 1 pilot cannot be overwritten")
    scope = {"stage": args.stage, "lesson": args.lesson, "module": module}
    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {
        "schema": 1, "pairKey": "French:English", "locale": "fr-FR", "voices": VOICES,
        "scope": scope, "sourceFixtureSha256": source_sha, "listeningReviewed": False,
        "registered": False, "clips": {},
    }
    if (manifest.get("pairKey"), manifest.get("locale"), manifest.get("voices"), manifest.get("scope"),
        manifest.get("sourceFixtureSha256"), manifest.get("listeningReviewed"), manifest.get("registered")) != (
        "French:English", "fr-FR", VOICES, scope, source_sha, False, False):
        raise ValueError("Existing manifest identity, source or review state differs")
    if set(manifest["clips"]) - set(entries):
        raise ValueError("Existing manifest contains out-of-scope text")
    jobs = []
    for key, row in entries.items():
        existing = manifest["clips"].get(key)
        if existing and (existing["displayText"] != row["displayText"] or existing["spokenText"] != row["spokenText"]):
            raise ValueError("Existing manifest text changed")
        for gender, voice in VOICES.items():
            filename = f"fr-101-{key[:20]}-{gender}.mp3"
            clip = existing.get("voices", {}).get(gender) if existing else None
            path = output / filename
            if clip and path.is_file() and clip.get("voice") == voice and clip.get("spokenText") == row["spokenText"]:
                data = path.read_bytes()
                if len(data) == clip.get("bytes") and sha(data) == clip.get("sha256") and duration(path) == clip.get("durationSeconds"):
                    continue
            jobs.append((key, row, gender, voice, filename))
    planned = jobs[:args.limit]
    print(json.dumps({"scope": scope, "sourceFixtureSha256": source_sha, "selectedTexts": len(entries),
                      "existingClips": len(entries) * 2 - len(jobs), "plannedClips": len(planned),
                      "plannedCharacters": sum(len(job[1]["spokenText"]) for job in planned),
                      "paidSynthesis": args.generate}, ensure_ascii=False), flush=True)
    if not args.generate:
        return
    output.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"],
                           capture_output=True, text=True, check=True).stdout.strip()
    for key, row, gender, voice, filename in planned:
        payload = {"input": {"text": row["spokenText"]}, "voice": {"languageCode": "fr-FR", "name": voice},
                   "audioConfig": {"audioEncoding": "MP3"}}
        request = urllib.request.Request("https://texttospeech.googleapis.com/v1/text:synthesize",
            data=json.dumps(payload).encode(), headers={"Authorization": "Bearer " + token,
            "Content-Type": "application/json", "x-goog-user-project": args.project})
        for attempt in range(3):
            try:
                response = json.load(urllib.request.urlopen(request, timeout=75))
                data = base64.b64decode(response["audioContent"])
                if len(data) <= 500:
                    raise ValueError("Empty MP3")
                path = output / filename
                temporary = path.with_suffix(".part")
                temporary.write_bytes(data)
                length = duration(temporary)
                temporary.replace(path)
                clip = manifest["clips"].setdefault(key, {**row, "voices": {}})
                clip["voices"][gender] = {"name": filename, "voice": voice, "locale": "fr-FR",
                    "spokenText": row["spokenText"], "bytes": len(data), "durationSeconds": length,
                    "sha256": sha(data), "listeningReviewed": False}
                save(manifest_path, manifest)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f"Synthesis HTTP {error.code}") from None
                time.sleep(2 ** attempt)
    print(json.dumps({"generatedClips": len(planned), "manifest": str(manifest_path)}), flush=True)


if __name__ == "__main__":
    main()
