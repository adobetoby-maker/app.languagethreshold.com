"""Validate and copy only the owner-accepted French 101 Foundation 1 audio pilot.

This does not synthesize audio or register the unreviewed French course.
"""

import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path("/Users/drive/lt-audio/french-101/foundation-1")
COURSE = ROOT / "content/french-basics/private-runtime-foundation-1-10.json"
DESTINATION = ROOT / "public/audio/french-101"
VOICES = {"female": "fr-FR-Chirp3-HD-Aoede", "male": "fr-FR-Chirp3-HD-Charon"}
PILOT_TEXTS = {"bonjour", "je m’appelle", "Comment vous appelez-vous ?", "enchantée", "Ça va bien, merci."}


def duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return round(float(result.stdout.strip()), 3)


def main() -> None:
    private = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    if (private.get("schema") != 1 or private.get("pairKey") != "French:English"
            or private.get("locale") != "fr-FR" or private.get("voices") != VOICES
            or private.get("listeningReviewed") is not True):
        raise ValueError("Pilot identity or listening review mismatch")
    review = private.get("listeningReview", {})
    if review.get("reviewer") != "owner" or review.get("decision") != "accepted-all-pilot-clips":
        raise ValueError("Owner pilot acceptance provenance mismatch")

    course_bytes = COURSE.read_bytes()
    course = json.loads(course_bytes)
    stage = course["stageFile"]
    if (course.get("registered") is not False or course.get("reviewed") is not False
            or stage.get("language") != "French" or stage.get("nativeLanguage") != "English"
            or stage.get("module") != "foundation-french-basics"):
        raise ValueError("French 101 private source identity changed")
    lesson = stage["lessons"][0]
    if lesson["n"] != 1:
        raise ValueError("Foundation 1 is not the first lesson")
    source_words = {hashlib.sha256(word["es"].encode("utf-8")).hexdigest(): word["es"] for word in lesson["words"]}
    clips = private["clips"]
    if set(clips) != {hashlib.sha256(text.encode("utf-8")).hexdigest() for text in PILOT_TEXTS} or not set(clips).issubset(source_words):
        raise ValueError("Pilot is not the expected five French 101 source words")

    entries = {}
    for source_key, pair in clips.items():
        if source_key != hashlib.sha256(source_words[source_key].encode("utf-8")).hexdigest():
            raise ValueError("Pilot source key mismatch")
        if set(pair) != set(VOICES):
            raise ValueError(f"Incomplete two-voice pair: {source_key}")
        entries[source_words[source_key]] = {}
        for gender, voice in VOICES.items():
            clip = pair[gender]
            name = f"fr-FR-{source_key[:20]}-{gender}.mp3"
            path = SOURCE / name
            if (not re.fullmatch(r"fr-FR-[a-f0-9]{20}-(female|male)\.mp3", name)
                    or clip.get("name") != name or clip.get("text") != source_words[source_key]
                    or clip.get("voice") != voice or clip.get("locale") != "fr-FR"
                    or clip.get("listeningReviewed") is not True or not path.is_file()
                    or clip.get("bytes") != path.stat().st_size
                    or clip.get("sha256") != hashlib.sha256(path.read_bytes()).hexdigest()
                    or clip.get("durationSeconds") != duration(path)
                    or not 0.1 < clip["durationSeconds"] < 120):
                raise ValueError(f"Invalid accepted pilot clip: {name}")
            entries[source_words[source_key]][gender] = clip

    output = {
        "version": 1,
        "pairKey": "French:English",
        "locale": "fr-FR",
        "sourceModule": "foundation-french-basics",
        "sourceLesson": 1,
        "sourceSha256": hashlib.sha256(course_bytes).hexdigest(),
        "textReviewed": False,
        "listeningReviewed": True,
        "listeningReview": review,
        "voices": VOICES,
        "entries": entries,
    }
    DESTINATION.mkdir(parents=True, exist_ok=True)
    expected_files = {clip["name"] for pair in entries.values() for clip in pair.values()}
    if {path.name for path in DESTINATION.glob("*.mp3")} - expected_files:
        raise ValueError("Unexpected French 101 pilot files remain in destination")
    for pair in entries.values():
        for clip in pair.values():
            shutil.copyfile(SOURCE / clip["name"], DESTINATION / clip["name"])
    serialized = json.dumps(output, ensure_ascii=False, indent=2) + "\n"
    (DESTINATION / "manifest.json").write_text(serialized, encoding="utf-8")
    (ROOT / "src/data/french-101-recordings.json").write_text(serialized, encoding="utf-8")
    print(f"Validated and copied {sum(map(len, entries.values()))} approved French pilot clips")


if __name__ == "__main__":
    main()
