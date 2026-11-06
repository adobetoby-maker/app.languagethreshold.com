#!/usr/bin/env python3
"""Derive a Japanese→English draft lesson glossary; never infer unreviewed senses."""

import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "content" / "japanese-basics"
OUTPUT = ROOT / "src" / "components" / "dictionary" / "japaneseWordData.json"
STAGES = (
    ("foundation", "foundation-japanese-basics"),
    ("core", "japanese-basics"),
    ("master", "master-japanese-basics"),
)


def pair(value: str) -> tuple[str, str]:
    parts = value.split("|", 1)
    if len(parts) != 2 or not all(part.strip() for part in parts):
        raise ValueError(f"Invalid Japanese→English pair: {value!r}")
    return parts[0].strip(), parts[1].strip()


def compact(value: str) -> str:
    return "".join(value.split())


def build() -> list[dict]:
    entries: dict[tuple[str, str], dict] = {}
    for stage, module_id in STAGES:
        source = json.loads((SOURCE / f"{stage}.json").read_text(encoding="utf-8"))
        if source.get("target") != "Japanese" or source.get("native") != "English":
            raise ValueError(f"Wrong authored pair in {stage}")
        if source.get("reviewed") is not False:
            raise ValueError(f"Unexpected review flag in {stage}")
        for lesson_number, lesson in enumerate(source["lessons"], 1):
            dialogue = [pair(line) for line in lesson["dialogue"]]
            # Some Master lessons inherit terms; only emit explicitly authored
            # headword/sense pairs rather than guessing a gloss from dialogue.
            for raw_term in lesson.get("terms", []):
                target, english = pair(raw_term)
                key = (compact(target), english.casefold())
                if key in entries:
                    continue
                match = next(
                    ((ja, en) for ja, en in dialogue if len(key[0]) > 1 and key[0] in compact(ja)),
                    None,
                )
                digest = hashlib.sha256(f"{key[0]}\0{key[1]}".encode()).hexdigest()[:16]
                href = "/?" + urlencode(
                    {
                        "module": module_id,
                        "tab": "core30",
                        "target": "Japanese",
                        "native": "English",
                        "lesson": lesson_number,
                        "way": "see",
                    }
                )
                entries[key] = {
                    "id": f"ja-en-{digest}",
                    "word": target,
                    "english": english,
                    "pronunciation": "",
                    "partOfSpeech": "term",
                    "category": "core",
                    "moduleId": module_id,
                    "lessonHref": href,
                    "examples": [{"target": match[0], "english": match[1]}] if match else [],
                }
    return sorted(entries.values(), key=lambda entry: (compact(entry["word"]), entry["english"]))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if committed output is stale")
    args = parser.parse_args()
    entries = build()
    encoded = json.dumps(entries, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != encoded:
            raise SystemExit("Japanese dictionary source is stale; rebuild it")
    else:
        OUTPUT.write_text(encoded, encoding="utf-8")
    print(f"Japanese→English draft glossary: {len(entries)} exact authored term/sense pairs")


if __name__ == "__main__":
    main()
