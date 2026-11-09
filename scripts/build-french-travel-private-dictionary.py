#!/usr/bin/env python3
"""Build a source-pinned, unreleased French Breakfast dictionary review inventory."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-dictionary-candidate.json"


def build():
    raw = SOURCE.read_bytes()
    fixture = json.loads(raw)
    assert fixture["moduleId"] == "travel-breakfast"
    assert fixture["targetLanguage"] == "French"
    assert fixture["nativeLanguage"] == "English"
    assert fixture["releaseGate"]["enabled"] is False
    assert len(fixture["lessons"]) == fixture["lessonCount"] == 60

    groups = defaultdict(list)
    lesson_reader_index = {}
    seen_ids = set()
    for lesson in fixture["lessons"]:
        assert lesson["reviewed"] is False and lesson["registered"] is False
        key = lesson["draftLessonKey"]
        reader_ids = [line["id"] for line in lesson["reader"]]
        lesson_reader_index[key] = reader_ids
        for word in lesson["words"]:
            word_id = word["id"]
            assert word_id not in seen_ids, word_id
            seen_ids.add(word_id)
            french = word["targetFrench"].strip()
            english = word["supportEnglish"].strip()
            assert french and english and word["sourceEnglish"].strip()
            groups[french.casefold()].append({
                "wordId": word_id,
                "lessonKey": key,
                "targetFrench": french,
                "supportEnglish": english,
                "sourceEnglish": word["sourceEnglish"],
                "kind": word["kind"],
            })

    assert len(seen_ids) == fixture["wordPlacements"] == 1117
    headwords = []
    collisions = []
    for surface, placements in sorted(groups.items()):
        glosses = sorted({p["supportEnglish"] for p in placements}, key=str.casefold)
        needs_review = len(glosses) > 1
        entry = {
            "surfaceKey": surface,
            "targetFrench": placements[0]["targetFrench"],
            "candidateGlossesEnglish": glosses,
            "placements": sorted(placements, key=lambda p: p["wordId"]),
            "qualifiedFrenchReviewRequired": True,
            "reviewed": False,
            "registered": False,
        }
        headwords.append(entry)
        if needs_review:
            collisions.append({
                "surfaceKey": surface,
                "candidateGlossesEnglish": glosses,
                "wordIds": sorted(p["wordId"] for p in placements),
                "interpretation": "unresolved: may be distinct senses, article variation, or synonym",
            })

    return {
        "schema": 1,
        "purpose": "private source-linked dictionary inventory for qualified review; never load in learner runtime",
        "moduleId": "travel-breakfast",
        "targetLanguage": "French",
        "nativeLanguage": "English",
        "sourceFixture": str(SOURCE.relative_to(ROOT)),
        "sourceFixtureSha256": hashlib.sha256(raw).hexdigest(),
        "stageCounts": fixture["stageCounts"],
        "lessonCount": 60,
        "wordPlacements": len(seen_ids),
        "surfaceHeadwords": len(headwords),
        "multipleGlossHeadwords": len(collisions),
        "lessonReaderLineIds": lesson_reader_index,
        "reviewed": False,
        "registered": False,
        "headwords": headwords,
        "multipleGlossReviewQueue": collisions,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    candidate = build()
    rendered = json.dumps(candidate, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "private dictionary candidate is stale"
        print(f"PASS: {candidate['wordPlacements']} placements, {candidate['surfaceHeadwords']} headwords, {candidate['multipleGlossHeadwords']} multiple-gloss review items")
    else:
        OUTPUT.write_text(rendered)
        print(f"Wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
