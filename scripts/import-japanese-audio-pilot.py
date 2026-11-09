"""Validate and copy the private Japanese 101 pilot into a reviewable web branch.

This is deliberately limited to Foundation 1's first five lines. It does not
generate paid audio. Listening acceptance is read from the owner's private
manifest only when every source clip carries the same acceptance decision.
"""

import hashlib
import json
import re
import shutil
import subprocess
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path("/Users/drive/lt-audio/japanese-101")
DESTINATION = ROOT / "public/audio/japanese-101"
VOICES = {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"}


def normalized(text):
    return " ".join(unicodedata.normalize("NFC", text).strip().split()).lower()


def spoken(text):
    return "".join(unicodedata.normalize("NFC", text).split())


def duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return round(float(result.stdout.strip()), 3)


def main():
    private = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    if private.get("schema") != 1 or private.get("locale") != "ja-JP" or private.get("voices") != VOICES:
        raise ValueError("Pilot manifest identity mismatch")
    review = private.get("listeningReview", {})
    accepted = private.get("listeningReviewed") is True
    if accepted and (review.get("reviewer") != "owner" or review.get("decision") != "accepted-all-pilot-clips"):
        raise ValueError("Pilot listening acceptance provenance mismatch")
    foundation = json.loads((ROOT / "public/lesson-content/ja/foundation-japanese-basics.json").read_text(encoding="utf-8"))
    if foundation.get("language") != "Japanese" or foundation.get("nativeLanguage") != "English":
        raise ValueError("Foundation language pair mismatch")
    lines = foundation["lessons"]["1"]["passage"]["target"][:5]
    if set(private["clips"]) != {normalized(line) for line in lines}:
        raise ValueError("Pilot lines do not match current Foundation 1")
    entries = {}
    for line in lines:
        key = normalized(line)
        pair = private["clips"][key]
        if set(pair) != set(VOICES):
            raise ValueError(f"Missing pilot voice for {key}")
        entries[key] = {}
        for gender, voice in VOICES.items():
            clip = pair[gender]
            name = "ja-101-" + hashlib.sha256(key.encode()).hexdigest()[:20] + f"-{gender}.mp3"
            if not re.fullmatch(r"ja-101-[a-f0-9]{20}-(female|male)\.mp3", name):
                raise ValueError("Unsafe clip name")
            source = SOURCE / name
            if (clip.get("name") != name or clip.get("voice") != voice or clip.get("locale") != "ja-JP"
                    or clip.get("spokenText") != spoken(line) or not source.is_file()
                    or source.stat().st_size != clip.get("bytes")
                    or hashlib.sha256(source.read_bytes()).hexdigest() != clip.get("sha256")
                    or duration(source) != clip.get("durationSeconds")):
                raise ValueError(f"Invalid pilot clip: {name}")
            if not 0.1 < clip["durationSeconds"] < 120:
                raise ValueError(f"Invalid duration: {name}")
            if accepted and clip.get("listeningReviewed") is not True:
                raise ValueError(f"Pilot clip lacks owner listening acceptance: {name}")
            entries[key][gender] = clip
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for pair in entries.values():
        for clip in pair.values():
            shutil.copyfile(SOURCE / clip["name"], DESTINATION / clip["name"])
    output = {
        "version": 1,
        "locale": "ja-JP",
        "voices": VOICES,
        "sourceModule": "foundation-japanese-basics",
        "sourceLesson": 1,
        "listeningReviewed": accepted,
        "listeningReview": review if accepted else None,
        "entries": entries,
    }
    (DESTINATION / "manifest.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "src/data/japanese-101-recordings.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Validated and imported {sum(map(len, entries.values()))} clips for {len(entries)} exact lines; owner listening accepted: {accepted}")


if __name__ == "__main__":
    main()
