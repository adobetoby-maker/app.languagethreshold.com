#!/usr/bin/env python3
"""Prepare a private spoken-text review plan without changing exact lesson text."""

import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("content/french-roofing/private-audio-scope-fr-en.json")
OUTPUT = Path("content/french-roofing/private-spoken-text-plan-fr-en.json")
PREFIX = re.compile(r"^([^:：]{1,50})\s*[:：]\s*(.+)$")

# Only unambiguous dialogue-name prefixes are proposed for removal. Role labels,
# report headings and narrated attributions remain intact pending language review.
SPEAKER_NAMES = {
    "Rogelio", "Kevin", "Julio", "Marcos", "M. Kim", "M. Ramírez",
    "Mme Flores", "Mme Novak",
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build():
    raw = (ROOT / SOURCE).read_bytes()
    source = json.loads(raw)
    if source["pairKey"] != "French:English" or source["locale"] != "fr-FR" or source["reviewed"]:
        raise ValueError("Wrong private French Roofing audio source")
    if len(source["texts"]) != source["counts"]["uniqueExactTexts"]:
        raise ValueError("Audio source count changed")
    rows = []
    plain_count = 0
    for item in source["texts"]:
        display = item["text"]
        if sha(display.encode()) != item["sha256"]:
            raise ValueError("Audio source text hash changed")
        match = PREFIX.match(display)
        if not match:
            plain_count += 1
            continue  # Plain strings speak exactly as displayed in the source inventory.
        label = match.group(1).strip()
        if label in SPEAKER_NAMES:
            kind = "dialogue-speaker-label"
            proposed_spoken = match.group(2)
        else:
            kind = "heading-or-narration-review"
            proposed_spoken = display
        if not proposed_spoken.strip():
            raise ValueError("Empty proposed spoken text")
        rows.append({
            "displayTextSha256": item["sha256"],
            "displayText": display,
            "prefix": label,
            "kind": kind,
            "proposedSpokenText": proposed_spoken,
            "sourceOccurrences": item["occurrences"],
            "textReviewed": False,
            "listeningReviewed": False,
        })
    return {
        "schema": 1,
        "moduleId": "roofing",
        "pairKey": "French:English",
        "locale": "fr-FR",
        "sourceInventoryPath": str(SOURCE),
        "sourceInventoryFileSha256": sha(raw),
        "exactDisplayTextSha256": source["exactTextSha256"],
        "registered": False,
        "reviewed": False,
        "counts": {
            "exactDisplayTexts": len(source["texts"]),
            "dialogueSpeakerLabels": sum(row["kind"] == "dialogue-speaker-label" for row in rows),
            "headingsOrNarrationForReview": sum(row["kind"] == "heading-or-narration-review" for row in rows),
            "plainSourceTexts": plain_count,
        },
        "rows": rows,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    target = ROOT / OUTPUT
    if args.check:
        if not target.is_file() or target.read_text() != encoded:
            raise SystemExit("French Roofing spoken-text plan needs regeneration")
    else:
        target.write_text(encoded)
    print("French Roofing private spoken-text plan verified")
