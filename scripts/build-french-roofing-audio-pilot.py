#!/usr/bin/env python3
"""Pin a small, unsynthesized Foundation 1 French Roofing listening pilot."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-audio-scope-fr-en.json"
OUTPUT = ROOT / "content/french-roofing/private-audio-pilot-foundation-1.json"
PILOT_TEXTS = (
    "Bonjour.",
    "le toit",
    "l'échelle",
    "Plus lentement, s'il vous plaît.",
    "Bonjour, je m'appelle Luis et je suis nouveau.",
)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build():
    source = json.loads(SOURCE.read_text())
    assert source["pairKey"] == "French:English" and source["locale"] == "fr-FR"
    assert source["reviewed"] is source["recordingsGenerated"] is False
    by_text = {row["text"]: row for row in source["texts"]}
    assert len(by_text) == source["counts"]["uniqueExactTexts"]
    rows = []
    for phrase in PILOT_TEXTS:
        row = by_text[phrase]
        assert row["sha256"] == digest(phrase.encode("utf-8"))
        assert any(item["draftLessonKey"] == "foundation:1" for item in row["occurrences"])
        rows.append(row)
    return {
        "schema": 1,
        "state": "private-audio-pilot-unsynthesized",
        "moduleId": "roofing",
        "pairKey": "French:English",
        "locale": "fr-FR",
        "draftLessonKey": "foundation:1",
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
        "exactTextSha256": digest("\n".join(row["text"] for row in rows).encode("utf-8")),
        "texts": rows,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == encoded, "French Roofing pilot inventory is stale"
    else:
        OUTPUT.write_text(encoded)
    print("French Roofing Foundation 1 private audio pilot verified")


if __name__ == "__main__":
    main()
