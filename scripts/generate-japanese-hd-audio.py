"""Generate a bounded, resumable Japanese 101 Chirp 3 HD audio pilot.

Default is a dry run. Paid synthesis requires --project and --generate. Recordings
stay outside the repository until exact text, voice, duration and listening pass.
"""

import argparse
import base64
import hashlib
import json
import os
import subprocess
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICES = {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"}
DEFAULT_OUTPUT = Path("/Users/drive/lt-audio/japanese-101")


def normalized(text):
    return " ".join(unicodedata.normalize("NFC", text).strip().split()).lower()


def spoken(text):
    return "".join(unicodedata.normalize("NFC", text).split())


def collect(inventory_path):
    entries = {}
    for path in sorted((ROOT / "public/lesson-content/ja").glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("language") != "Japanese" or data.get("nativeLanguage") != "English":
            raise ValueError(f"Wrong language pair: {path.name}")
        for lesson in data["lessons"].values():
            for text in lesson["passage"]["target"]:
                entries.setdefault(normalized(text), spoken(text))
            for word in lesson["words"]:
                entries.setdefault(normalized(word["es"]), spoken(word["es"]))
    report = json.loads(inventory_path.read_text())
    fingerprint = hashlib.sha256(json.dumps(entries, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    if fingerprint != report["normalizedTextSHA256"] or len(entries) != report["uniqueTexts"]:
        raise ValueError("Japanese audio inventory is stale")
    return entries, fingerprint


def pilot_keys():
    foundation = json.loads((ROOT / "public/lesson-content/ja/foundation-japanese-basics.json").read_text())
    return [normalized(text) for text in foundation["lessons"]["1"]["passage"]["target"][:5]]


def lesson_keys(module, number):
    if module not in ("foundation-japanese-basics", "japanese-basics", "master-japanese-basics"):
        raise ValueError(f"Unsupported Japanese 101 module: {module}")
    source = json.loads((ROOT / "public/lesson-content/ja" / f"{module}.json").read_text(encoding="utf-8"))
    if source.get("language") != "Japanese" or source.get("nativeLanguage") != "English":
        raise ValueError("Wrong lesson language pair")
    lesson = source["lessons"].get(str(number))
    if lesson is None:
        raise ValueError(f"Missing lesson {number} in {module}")
    values = [*lesson["passage"]["target"], *(word["es"] for word in lesson["words"])]
    return list(dict.fromkeys(normalized(value) for value in values))


def duration_seconds(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    duration = float(result.stdout.strip())
    if not 0.1 < duration < 120:
        raise ValueError(f"Invalid audio duration: {path.name}")
    return round(duration, 3)


def atomic_json(path, value):
    temp = path.with_suffix(path.suffix + ".part")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temp.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", help="Google quota project; required with --generate")
    parser.add_argument("--generate", action="store_true", help="Call paid synthesis; default only reports plan")
    parser.add_argument("--limit", type=int, default=10, help="At most 20 new clips per run")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--module", help="Exact Japanese 101 stage module for a private lesson batch")
    parser.add_argument("--lesson", type=int, help="Stage-local lesson number for --module")
    parser.add_argument("--inventory", type=Path, default=ROOT / "docs/japanese-program/audio-inventory.json",
                        help="Exact source inventory; defaults to the checked-in course inventory")
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        raise SystemExit("--limit must be between 1 and 20")
    if args.generate and not args.project:
        raise SystemExit("--project is required with --generate")
    if bool(args.module) != bool(args.lesson):
        raise SystemExit("--module and --lesson must be used together")
    if args.module and args.output.expanduser().resolve() == DEFAULT_OUTPUT.resolve():
        raise SystemExit("Use a separate --output directory for an unreviewed lesson batch")
    os.umask(0o077)
    entries, fingerprint = collect(args.inventory)
    selected = lesson_keys(args.module, args.lesson) if args.module else pilot_keys()
    scope = {"module": args.module, "lesson": args.lesson} if args.module else None
    manifest_path = args.output / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {
        "schema": 1, "locale": "ja-JP", "voices": VOICES, "clips": {},
        "sourceSHA256": fingerprint, "scope": scope, "listeningReviewed": False,
    }
    if manifest["locale"] != "ja-JP" or manifest["voices"] != VOICES:
        raise ValueError("Existing manifest voice identity mismatch")
    if scope and (manifest.get("scope") != scope or manifest.get("sourceSHA256") != fingerprint):
        raise ValueError("Existing lesson batch scope or source fingerprint mismatch")
    if scope and (manifest.get("listeningReviewed") is not False or set(manifest["clips"]) - set(selected)):
        raise ValueError("Lesson batch has accepted or out-of-scope clips")
    jobs = []
    for key in selected:
        if key not in entries:
            raise ValueError("Pilot sentence absent from current inventory")
        for gender, voice in VOICES.items():
            name = "ja-101-" + hashlib.sha256(key.encode()).hexdigest()[:20] + "-" + gender + ".mp3"
            clip = manifest["clips"].get(key, {}).get(gender)
            path = args.output / name
            if clip and clip.get("voice") == voice and clip.get("spokenText") == entries[key] and path.is_file():
                if hashlib.sha256(path.read_bytes()).hexdigest() == clip.get("sha256") and duration_seconds(path) == clip.get("durationSeconds"):
                    continue
            jobs.append((key, entries[key], gender, voice, name))
    planned = jobs[:args.limit]
    print(json.dumps({"sourceSHA256": fingerprint, "scope": scope, "selectedTexts": len(selected), "existingClips": len(selected) * 2 - len(jobs),
                      "plannedClips": len(planned), "plannedCharacters": sum(len(job[1]) for job in planned), "voices": VOICES,
                      "paidSynthesis": args.generate}, ensure_ascii=False), flush=True)
    if not args.generate:
        return
    args.output.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"], capture_output=True, text=True, check=True).stdout.strip()
    for key, text, gender, voice, name in planned:
        payload = {"input": {"text": text}, "voice": {"languageCode": "ja-JP", "name": voice}, "audioConfig": {"audioEncoding": "MP3"}}
        request = urllib.request.Request("https://texttospeech.googleapis.com/v1/text:synthesize", data=json.dumps(payload).encode(),
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", "x-goog-user-project": args.project})
        for attempt in range(3):
            try:
                response = json.load(urllib.request.urlopen(request, timeout=75))
                data = base64.b64decode(response["audioContent"])
                if len(data) <= 500:
                    raise ValueError("Empty MP3")
                path = args.output / name
                temporary = path.with_suffix(".part")
                temporary.write_bytes(data)
                duration = duration_seconds(temporary)
                temporary.replace(path)
                manifest["clips"].setdefault(key, {})[gender] = {"name": name, "voice": voice, "locale": "ja-JP",
                    "spokenText": text, "bytes": len(data), "durationSeconds": duration,
                    "sha256": hashlib.sha256(data).hexdigest(), "listeningReviewed": False}
                atomic_json(manifest_path, manifest)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f"Synthesis HTTP {error.code}") from None
                time.sleep(2 ** attempt)
    print(json.dumps({"generatedClips": len(planned), "manifest": str(manifest_path)}), flush=True)


if __name__ == "__main__":
    main()
