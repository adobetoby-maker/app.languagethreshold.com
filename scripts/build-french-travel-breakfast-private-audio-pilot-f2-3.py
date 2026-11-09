#!/usr/bin/env python3
"""Pin five exact Foundation 2–3 strings for a private listening pilot."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content/french-travel-breakfast"
SCOPE = BASE / "private-audio-scope-fr-en.json"
OUTPUT = BASE / "private-audio-pilot-foundation-2-3.json"
TEXTS = [
    "Il est huit heures et demie.",
    "Luis : Le café coûte trois euros la tasse ; le jus, quatre euros le verre.",
    "Luis : C’est deux euros la pièce, ou vingt euros la douzaine.",
    "Daniel : Le café est très chaud, mais le jus est froid.",
    "Daniel : La sauce au piment est très piquante, mais elle est délicieuse.",
]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def build():
    scope_raw = SCOPE.read_bytes()
    scope = json.loads(scope_raw)
    assert scope["moduleId"] == "travel-breakfast" and scope["pairKey"] == "French:English"
    index = {row["text"]: row for row in scope["texts"]}
    rows = [index[text] for text in TEXTS]
    assert len(rows) == len(set(TEXTS)) == 5
    assert all(any(o["draftLessonKey"] in ("foundation:2", "foundation:3") for o in row["occurrences"]) for row in rows)
    return {
        "schema": 1,
        "state": "private-audio-pilot-unsynthesized",
        "moduleId": "travel-breakfast",
        "pairKey": "French:English",
        "locale": "fr-FR",
        "draftLessonKeys": ["foundation:2", "foundation:3"],
        "sourceFixtureSha256": scope["sourceFixtureSha256"],
        "sourceInventorySha256": sha(scope_raw),
        "reviewed": False,
        "recordingsGenerated": False,
        "listeningReviewed": False,
        "registered": False,
        "counts": {"uniqueExactTexts": 5, "twoVoiceClips": 10,
                   "unicodeCharactersPerVoice": sum(len(text) for text in TEXTS)},
        "exactTextSha256": sha("\n".join(TEXTS).encode()),
        "texts": rows,
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == encoded, "French Travel Breakfast pilot is stale"
    else:
        OUTPUT.write_text(encoded)
    print("French Travel Breakfast Foundation 2–3 private audio pilot verified")

if __name__ == "__main__":
    main()
