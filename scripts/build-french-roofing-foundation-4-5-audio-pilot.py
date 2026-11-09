#!/usr/bin/env python3
"""Pin five exact Foundation 4–5 French Roofing texts for private audio review."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-audio-scope-fr-en.json"
OUTPUT = ROOT / "content/french-roofing/private-audio-pilot-foundation-4-5.json"
TEXTS = (
    ("foundation:4", "l'eau"),
    ("foundation:4", "Il y a un problème."),
    ("foundation:4", "J'ai soif et je veux de l'eau fraîche."),
    ("foundation:5", "aujourd'hui"),
    ("foundation:5", "Maintenant, je vais monter sur le toit."),
)


def sha(value):
    return hashlib.sha256(value.encode()).hexdigest()


def build():
    source = json.loads(SOURCE.read_text())
    assert source["pairKey"] == "French:English" and source["locale"] == "fr-FR"
    assert source["reviewed"] is source["registered"] is False
    by_text = {row["text"]: row for row in source["texts"]}
    assert len(by_text) == source["counts"]["uniqueExactTexts"]
    rows = []
    for lesson_key, text in TEXTS:
        row = by_text[text]
        assert row["sha256"] == sha(text)
        assert any(item["draftLessonKey"] == lesson_key for item in row["occurrences"])
        rows.append(row)
    return {
        "schema": 1,
        "state": "private-audio-pilot-unsynthesized",
        "moduleId": "roofing",
        "pairKey": "French:English",
        "locale": "fr-FR",
        "draftLessonKeys": ["foundation:4", "foundation:5"],
        "sourceFixtureSha256": source["sourceFixtureSha256"],
        "sourceInventorySha256": source["exactTextSha256"],
        "reviewed": False,
        "recordingsGenerated": False,
        "listeningReviewed": False,
        "registered": False,
        "counts": {
            "uniqueExactTexts": len(rows),
            "twoVoiceClips": len(rows) * 2,
            "unicodeCharactersPerVoice": sum(len(row["text"]) for row in rows),
        },
        "exactTextSha256": sha("\n".join(row["text"] for row in rows)),
        "texts": rows,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "Foundation 4–5 audio pilot is stale"
    else:
        OUTPUT.write_text(rendered)
    print("PASS: Foundation 4–5 private pilot pinned to five exact source texts")


if __name__ == "__main__":
    main()
