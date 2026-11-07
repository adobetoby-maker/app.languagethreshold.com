#!/usr/bin/env python3
"""Derive a private, exact-pair dictionary inventory from authored Breakfast cards."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-travel-breakfast"
OUTPUT = CONTENT / "private-dictionary-draft-ja-en.json"
SOURCES = (
    ("foundation", "foundation-1-10-draft.json", "foundation-travel-breakfast", 10),
    ("core", "core-1-30-draft.json", "travel-breakfast", 30),
)


def build():
    entries = {}
    source_hashes = {}
    placements = 0
    for stage, filename, stage_id, expected_lessons in SOURCES:
        raw = (CONTENT / filename).read_bytes()
        source_hashes[filename] = hashlib.sha256(raw).hexdigest()
        data = json.loads(raw)
        assert (data["moduleId"], data["stageId"], data["target"], data["native"]) == (
            "travel-breakfast", stage_id, "Japanese", "English"
        )
        assert data["reviewed"] is False and data["registered"] is False
        assert [lesson["n"] for lesson in data["lessons"]] == list(range(1, expected_lessons + 1))
        for lesson in data["lessons"]:
            assert lesson["stableId"] == f"{stage_id}:{lesson['n']}:ja-en"
            for position, card in enumerate(lesson["cards"], 1):
                target, native = card["ja"], card["en"]
                assert target and native and target == target.strip() and native == native.strip()
                pair = (target, native)
                if pair not in entries:
                    pair_hash = hashlib.sha256("\0".join(pair).encode("utf-8")).hexdigest()[:16]
                    entries[pair] = {
                        "id": f"dict-ja-en-{pair_hash}",
                        "target": target,
                        "native": native,
                        "kindVariants": [],
                        "partOfSpeech": None,
                        "inflection": None,
                        "reviewed": False,
                        "occurrences": [],
                    }
                entry = entries[pair]
                if card["kind"] not in entry["kindVariants"]:
                    entry["kindVariants"].append(card["kind"])
                entry["occurrences"].append({
                    "stage": stage,
                    "stageId": stage_id,
                    "lesson": lesson["n"],
                    "stableLessonId": lesson["stableId"],
                    "cardPosition": position,
                    "sourceFile": filename,
                    **({"note": card["note"]} if card.get("note") else {}),
                })
                placements += 1

    by_target = defaultdict(set)
    for target, native in entries:
        by_target[target].add(native)
    for entry in entries.values():
        entry["kindVariants"].sort()
        entry["needsSenseReview"] = len(by_target[entry["target"]]) > 1
        entry["needsKindReview"] = len(entry["kindVariants"]) > 1
    return {
        "schema": 1,
        "state": "private-dictionary-draft",
        "moduleId": "travel-breakfast",
        "targetLanguage": "Japanese",
        "supportLanguage": "English",
        "pairKey": "Japanese:English",
        "reviewed": False,
        "registered": False,
        "sourceSha256": source_hashes,
        "counts": {
            "foundationLessons": 10,
            "coreLessons": 30,
            "placements": placements,
            "exactPairs": len(entries),
            "ambiguousHeadwords": sum(len(glosses) > 1 for glosses in by_target.values()),
            "kindConflicts": sum(len(entry["kindVariants"]) > 1 for entry in entries.values()),
            "missingPartOfSpeech": len(entries),
            "missingInflection": len(entries),
        },
        "entries": sorted(entries.values(), key=lambda entry: (entry["target"], entry["native"])),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    serialized = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == serialized, "Private Breakfast dictionary inventory is stale"
    else:
        OUTPUT.write_text(serialized)
    print("Japanese Breakfast private dictionary exact-pair inventory verified")


if __name__ == "__main__":
    main()
