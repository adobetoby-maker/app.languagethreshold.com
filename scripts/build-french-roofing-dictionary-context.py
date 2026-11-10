#!/usr/bin/env python3
"""Collect lesson context for non-article French Roofing gloss variations."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content/french-roofing"
INVENTORY = BASE / "private-dictionary-inventory-fr-en.json"
RUNTIME = BASE / "private-runtime-candidate.json"
OUTPUT = BASE / "private-dictionary-context-fr-en.json"
ARTICLE_OUTPUT = BASE / "private-dictionary-article-context-fr-en.json"


def build(article_only=False):
    inventory_raw, runtime_raw = INVENTORY.read_bytes(), RUNTIME.read_bytes()
    inventory, runtime = json.loads(inventory_raw), json.loads(runtime_raw)
    assert inventory["pairKey"] == "French:English"
    assert inventory["registered"] is False and inventory["reviewed"] is False
    assert inventory["sourceSha256"] == hashlib.sha256(runtime_raw).hexdigest()
    assert runtime["releaseGate"]["runtimeRegistered"] is False
    pairs = {entry["pairId"]: entry for entry in inventory["exactPairs"]}
    lessons = {lesson["draftLessonKey"]: lesson for lesson in runtime["lessons"]}
    evidence = []
    for group in inventory["ambiguityEvidence"]:
        if bool(group["articleOnlyCandidate"]) != article_only:
            continue
        variants = []
        for pair_id in group["pairIds"]:
            pair = pairs[pair_id]
            occurrences = []
            for placement in pair["sourceOccurrences"]:
                lesson = lessons[placement["lesson"]]
                target = pair["observedFrenchForms"][0]
                exact_lines = [
                    line for line in lesson["reader"]
                    if target.casefold() in line["targetFrench"].casefold()
                ]
                occurrences.append({
                    "lesson": placement["lesson"],
                    "wordId": placement["wordId"],
                    "lessonTitleEnglish": lesson["titleEnglish"],
                    "lessonObjectiveEnglish": lesson["objectiveEnglish"],
                    "exactTargetReaderLines": [
                        {"lineId": line["id"], "targetFrench": line["targetFrench"],
                         "supportEnglish": line["supportEnglish"]}
                        for line in exact_lines
                    ],
                })
            variants.append({
                "pairId": pair_id,
                "observedFrenchForms": pair["observedFrenchForms"],
                "supportEnglish": pair["supportEnglish"],
                "occurrences": occurrences,
            })
        record = {
            "headwordKey": group["headwordKey"],
            "variants": variants,
            "resolution": "unreviewed",
            "qualifiedFrenchAndTradeReviewRequired": True,
        }
        if article_only:
            record["articleOnlyCandidate"] = True
        evidence.append(record)
    expected = inventory["counts"]["articleOnlyCandidates" if article_only else "otherMeaningVariations"]
    assert len(evidence) == expected
    return {
        "schema": 1,
        "purpose": "private source context for dictionary sense review; not approved glosses",
        "pairKey": "French:English",
        "inventorySha256": hashlib.sha256(inventory_raw).hexdigest(),
        "runtimeSha256": hashlib.sha256(runtime_raw).hexdigest(),
        "reviewed": False,
        "registered": False,
        "counts": {
            "headwords": len(evidence),
            "pairVariants": sum(len(item["variants"]) for item in evidence),
            "sourcePlacements": sum(
                len(variant["occurrences"])
                for item in evidence for variant in item["variants"]
            ),
        },
        "headwords": evidence,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for output, article_only in ((OUTPUT, False), (ARTICLE_OUTPUT, True)):
        result = build(article_only=article_only)
        rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
        if args.check:
            assert output.read_text() == rendered, f"French Roofing dictionary context is stale: {output.name}"
        else:
            output.write_text(rendered)
        print(output.name, json.dumps(result["counts"]))


if __name__ == "__main__":
    main()
