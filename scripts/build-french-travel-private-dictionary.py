#!/usr/bin/env python3
"""Build a source-pinned, unreleased French Breakfast dictionary review inventory."""

import argparse
import hashlib
import json
from collections import defaultdict
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-dictionary-candidate.json"
WORKSHEET = ROOT / "content/french-travel-breakfast/private-dictionary-review.html"


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


def worksheet(candidate):
    fixture = json.loads(SOURCE.read_text())
    lessons = {lesson["draftLessonKey"]: lesson for lesson in fixture["lessons"]}
    entries = {entry["surfaceKey"]: entry for entry in candidate["headwords"]}
    parts = [
        '<!doctype html><html lang="en"><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        '<title>French Breakfast dictionary context review</title>',
        '<style>body{font:16px/1.5 system-ui,sans-serif;max-width:60rem;margin:auto;padding:1rem;color:#18212d;background:#fff}',
        'h1,h2{line-height:1.2}article{border-top:2px solid #263b54;padding:1rem 0}section{border:1px solid #aab5c2;border-radius:.5rem;padding:.75rem;margin:.75rem 0}',
        'small{color:#41546b}p{margin:.4rem 0}ol{padding-left:1.5rem}li{margin:.35rem 0}code{overflow-wrap:anywhere}</style>',
        '<h1>French Breakfast dictionary context review</h1>',
        '<p>Private draft: 56 multiple-gloss French surfaces. Source-pinned lesson text is shown exactly as authored.',
        ' Record qualified French review outside this worksheet; it does not approve senses or register content.</p>',
    ]
    for item in candidate["multipleGlossReviewQueue"]:
        entry = entries[item["surfaceKey"]]
        parts.append(f'<article><h2>{escape(entry["targetFrench"])}</h2>')
        parts.append(f'<p><strong>Glosses:</strong> {escape(" | ".join(item["candidateGlossesEnglish"]))}</p>')
        for placement in entry["placements"]:
            lesson = lessons[placement["lessonKey"]]
            parts.append('<section>')
            parts.append(f'<p><strong>{escape(placement["lessonKey"])} · {escape(lesson["titleEnglish"])}</strong> <small><code>{escape(placement["wordId"])}</code></small></p>')
            parts.append(f'<p>French: <strong lang="fr">{escape(placement["targetFrench"])}</strong> · English: <strong>{escape(placement["supportEnglish"])}</strong> · source: {escape(placement["sourceEnglish"])}</p>')
            parts.append(f'<p><small>{escape(lesson["objectiveEnglish"])}</small></p><details><summary>Lesson Reader context</summary><ol>')
            for line in lesson["reader"]:
                parts.append(f'<li><span lang="fr">{escape(line["targetFrench"])}</span><br>{escape(line["supportEnglish"])} <small><code>{escape(line["id"])}</code></small></li>')
            parts.append('</ol></details></section>')
        parts.append('</article>')
    parts.append('</html>')
    return "\n".join(parts) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    candidate = build()
    rendered = json.dumps(candidate, ensure_ascii=False, indent=2) + "\n"
    rendered_worksheet = worksheet(candidate)
    if args.check:
        assert OUTPUT.read_text() == rendered, "private dictionary candidate is stale"
        assert WORKSHEET.read_text() == rendered_worksheet, "private dictionary worksheet is stale"
        print(f"PASS: {candidate['wordPlacements']} placements, {candidate['surfaceHeadwords']} headwords, {candidate['multipleGlossHeadwords']} multiple-gloss review items")
    else:
        OUTPUT.write_text(rendered)
        WORKSHEET.write_text(rendered_worksheet)
        print(f"Wrote {OUTPUT.relative_to(ROOT)} and {WORKSHEET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
