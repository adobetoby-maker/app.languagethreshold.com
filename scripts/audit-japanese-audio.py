"""Inventory Japanese lesson speech before any paid synthesis or native import.

Reads authored public Japanese lesson files only. This script never calls a provider,
writes recordings, or changes learner data. Japanese teaching spaces are removed
from the synthesis text while the exact displayed text remains the lookup key.
"""

import argparse
import hashlib
import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICES = {
    "female": "ja-JP-Chirp3-HD-Aoede",
    "male": "ja-JP-Chirp3-HD-Charon",
}


def normalized(text):
    return " ".join(unicodedata.normalize("NFC", text).strip().split()).lower()


def spoken(text):
    # Authored beginner readings use spaces to mark word boundaries; Japanese TTS
    # should receive the natural unspaced sentence. The original is retained for UI.
    return "".join(unicodedata.normalize("NFC", text).split())


def inventory(root=ROOT):
    folder = root / "public/lesson-content/ja"
    entries = {}
    modules = {}
    for path in sorted(folder.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("language") != "Japanese" or data.get("nativeLanguage") != "English":
            raise ValueError(f"Unexpected language pair in {path.name}")
        module = data["module"]
        if module != path.stem:
            raise ValueError(f"Unexpected module ID in {path.name}")
        keys = set()
        for lesson in data["lessons"].values():
            for text in lesson["passage"]["target"]:
                keys.add(normalized(text))
                entries.setdefault(normalized(text), spoken(text))
            for word in lesson["words"]:
                keys.add(normalized(word["es"]))
                entries.setdefault(normalized(word["es"]), spoken(word["es"]))
        modules[module] = {"lessons": len(data["lessons"]), "uniqueTexts": len(keys),
                           "reviewed": data.get("reviewed") is True}
    if any(not value for value in entries.values()):
        raise ValueError("Empty spoken text")
    serialized = json.dumps(entries, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return {
        "schema": 1,
        "targetLanguage": "Japanese",
        "nativeLanguage": "English",
        "locale": "ja-JP",
        "provider": "Google Cloud Chirp 3 HD",
        "voices": VOICES,
        "modules": modules,
        "uniqueTexts": len(entries),
        "requiredClips": len(entries) * len(VOICES),
        "spokenCharactersPerVoice": sum(len(value) for value in entries.values()),
        "spokenCharactersAllVoices": sum(len(value) for value in entries.values()) * len(VOICES),
        "normalizedTextSHA256": hashlib.sha256(serialized).hexdigest(),
        "recordingsGenerated": False,
        "listeningReviewed": False,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, help="Write the read-only inventory JSON here")
    parser.add_argument("--check", action="store_true", help="Fail when the saved inventory is stale")
    args = parser.parse_args()
    report = inventory()
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not args.output or not args.output.is_file() or args.output.read_text(encoding="utf-8") != encoded:
            raise SystemExit("Japanese audio inventory is missing or stale")
        raise SystemExit(0)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded, encoding="utf-8")
    else:
        print(encoded, end="")
