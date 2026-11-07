"""Read-only, exact-source audio scope for private Japanese Foreman drafts.

No synthesis, playback approval, runtime registration, or learner data access.
Use --output to write a report and --check to detect stale source/report pairs.
"""

import argparse
import hashlib
import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COURSE = ROOT / "content/japanese-construction-foreman"
VOICES = {
    "female": "ja-JP-Chirp3-HD-Aoede",
    "male": "ja-JP-Chirp3-HD-Charon",
}
STAGES = {
    "foundation": ("foundation-runtime-draft-ja-en.json", 10),
    "core": ("core-runtime-pilot-*-ja-en.json", 30),
    "master": ("master-runtime-pilot-*-ja-en.json", 20),
}


def normalized(text):
    return " ".join(unicodedata.normalize("NFC", text).strip().split()).lower()


def spoken(text):
    return "".join(unicodedata.normalize("NFC", text).split())


def inventory(root=ROOT):
    course = root / "content/japanese-construction-foreman"
    unique = {}
    sources = []
    stages = {}
    for stage, (pattern, expected) in STAGES.items():
        files = sorted(course.glob(pattern))
        if not files:
            raise ValueError(f"Missing {stage} source")
        lessons = {}
        original_readers = 0
        for path in files:
            raw = path.read_bytes()
            data = json.loads(raw)
            if data.get("target") != "Japanese" or data.get("native") != "English" or data.get("reviewed") is not False:
                raise ValueError(f"Wrong pair or review state: {path.name}")
            if data.get("stage", stage) != stage:
                raise ValueError(f"Wrong stage: {path.name}")
            sources.append({"path": path.relative_to(root).as_posix(), "sha256": hashlib.sha256(raw).hexdigest()})
            for lesson in data["lessons"]:
                number = lesson["n"]
                if number in lessons or lesson.get("reviewed") is not False:
                    raise ValueError(f"Duplicate lesson or false review state: {stage} {number}")
                lessons[number] = lesson
                reader = lesson["reader"]
                if reader.get("state") == "original-contextual-draft" or stage != "master":
                    original_readers += 1
                for word in lesson["words"]:
                    if not word.get("en") or not word.get("es"):
                        raise ValueError(f"Unpaired word: {stage} {number}")
                    text = word["es"]
                    unique.setdefault(normalized(text), spoken(text))
                for line in reader["sentences"]:
                    if not line.get("native") or not line.get("target"):
                        raise ValueError(f"Unpaired Reader line: {stage} {number}")
                    text = line["target"]
                    unique.setdefault(normalized(text), spoken(text))
        if set(lessons) != set(range(1, expected + 1)):
            raise ValueError(f"Incomplete {stage} numbering: {sorted(lessons)}")
        stages[stage] = {"privateLessons": expected, "originalContextualReaderDrafts": original_readers}
    if any(not key or not value for key, value in unique.items()):
        raise ValueError("Empty Japanese audio text")
    pairs = json.dumps(unique, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    source_fingerprint = hashlib.sha256(json.dumps(sources, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    characters = sum(len(text) for text in unique.values())
    return {
        "schema": 1,
        "scope": "Private Japanese:English Foreman words and original Reader only; excludes grammar, speaking, feedback, human review and runtime",
        "state": "private-unregistered-draft",
        "targetLanguage": "Japanese",
        "nativeLanguage": "English",
        "locale": "ja-JP",
        "voices": VOICES,
        "stages": stages,
        "sources": sources,
        "sourceFilesSHA256": source_fingerprint,
        "normalizedTextSHA256": hashlib.sha256(pairs).hexdigest(),
        "uniqueDisplayStrings": len(unique),
        "plannedClipsTwoVoices": len(unique) * 2,
        "spokenCharactersPerVoice": characters,
        "spokenCharactersTwoVoices": characters * 2,
        "recordingsGenerated": False,
        "listeningReviewed": False,
        "humanReviewed": False,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = json.dumps(inventory(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not args.output or not args.output.is_file() or args.output.read_text(encoding="utf-8") != encoded:
            raise SystemExit("Foreman audio inventory is missing or stale")
    elif args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded, encoding="utf-8")
    else:
        print(encoded, end="")
