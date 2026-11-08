#!/usr/bin/env python3
"""Inventory exact French Roofing card senses without publishing a dictionary."""

import argparse
import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-roofing/private-dictionary-inventory-fr-en.json"


def digest(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def headword_key(value):
    return unicodedata.normalize("NFC", value).casefold().strip()


def english_article_key(value):
    return re.sub(r"^(?:the|an|a)\s+", "", value.casefold().strip())


def build():
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)
    assert source["moduleId"] == "roofing"
    assert (source["targetLanguage"], source["nativeLanguage"]) == ("French", "English")
    assert source["releaseGate"]["runtimeRegistered"] is False
    assert source["lessonCount"] == 60
    placements = defaultdict(list)
    forms = defaultdict(set)
    for lesson in source["lessons"]:
        assert lesson["reviewed"] is False and lesson["registered"] is False
        for word in lesson["words"]:
            french, english = word["targetFrench"], word["supportEnglish"]
            assert french and english
            key = (headword_key(french), english)
            forms[key].add(french)
            placements[key].append({"lesson": lesson["draftLessonKey"], "wordId": word["id"]})

    entries = []
    by_headword = defaultdict(list)
    for (headword, english), occurrences in sorted(placements.items()):
        french_forms = sorted(forms[(headword, english)])
        pair_id = "roofing-fr-en-" + digest(headword + "\0" + english)[:20]
        entry = {
            "pairId": pair_id,
            "headwordKey": headword,
            "observedFrenchForms": french_forms,
            "supportEnglish": english,
            "sourceOccurrences": occurrences,
            "partOfSpeech": None,
            "inflection": None,
            "qualifiedFrenchReviewRequired": True,
            "reviewed": False,
            "registered": False,
        }
        entries.append(entry)
        by_headword[headword].append(entry)

    ambiguity = []
    for headword, variants in sorted(by_headword.items()):
        if len(variants) < 2:
            continue
        english_forms = [variant["supportEnglish"] for variant in variants]
        article_only = len({english_article_key(value) for value in english_forms}) == 1
        ambiguity.append({
            "headwordKey": headword,
            "supportEnglishVariants": english_forms,
            "pairIds": [variant["pairId"] for variant in variants],
            "articleOnlyCandidate": article_only,
            "resolution": "unreviewed",
            "qualifiedFrenchReviewRequired": True,
        })

    assert len(entries) == source["distinctWordPairs"]
    assert sum(len(item["sourceOccurrences"]) for item in entries) == source["wordPlacements"]
    return {
        "schema": 1,
        "purpose": "private exact-pair dictionary evidence; no learner-facing sense registration",
        "moduleId": "roofing",
        "pairKey": "French:English",
        "sourceFile": SOURCE.name,
        "sourceSha256": hashlib.sha256(source_bytes).hexdigest(),
        "reviewed": False,
        "registered": False,
        "counts": {
            "wordPlacements": source["wordPlacements"],
            "distinctExactPairs": len(entries),
            "normalizedHeadwords": len(by_headword),
            "ambiguousHeadwords": len(ambiguity),
            "articleOnlyCandidates": sum(item["articleOnlyCandidate"] for item in ambiguity),
            "otherMeaningVariations": sum(not item["articleOnlyCandidate"] for item in ambiguity),
        },
        "ambiguityEvidence": ambiguity,
        "exactPairs": entries,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    result = build()
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "French Roofing dictionary inventory is stale"
    else:
        OUTPUT.write_text(rendered)
    print(json.dumps(result["counts"], ensure_ascii=False))


if __name__ == "__main__":
    main()
