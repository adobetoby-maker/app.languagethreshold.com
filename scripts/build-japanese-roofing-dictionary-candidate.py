#!/usr/bin/env python3
"""Build a private exact-pair dictionary candidate from Japanese Roofing drafts."""

import argparse
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-roofing"
OUTPUT = CONTENT / "dictionary-candidate.json"
COUNTS = {"foundation": 10, "core": 30, "master": 20}


def strip_article(gloss):
    return re.sub(r"^(the|a|an) +", "", gloss.casefold())


def build():
    lessons = defaultdict(dict)
    hashes = {}
    for stage in COUNTS:
        for path in sorted(CONTENT.glob(f"{stage}-*-draft.json")):
            data = json.loads(path.read_text(encoding="utf-8"))
            actual_stage = data.get("stage", data.get("stageId"))
            assert actual_stage == ("foundation-roofing" if stage == "foundation" else stage), path
            assert (data["target"], data["native"]) == ("Japanese", "English")
            assert data["reviewed"] is False and data["registered"] is False
            assert not any(data["reviewGates"].values())
            hashes[path.relative_to(ROOT).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
            for lesson in data["lessons"]:
                n = lesson["n"]
                assert n not in lessons[stage], (stage, n)
                lessons[stage][n] = lesson
    for stage, count in COUNTS.items():
        assert sorted(lessons[stage]) == list(range(1, count + 1)), stage

    occurrences = defaultdict(list)
    for stage in COUNTS:
        for n in sorted(lessons[stage]):
            lesson = lessons[stage][n]
            stable_id = lesson["stableId"]
            assert stable_id.endswith(f":{n}:ja-en"), stable_id
            for index, card in enumerate(lesson["cards"]):
                ja, en = card["ja"], card["en"]
                assert isinstance(ja, str) and ja.strip() and isinstance(en, str) and en.strip()
                # Context is evidence of occurrence, not proof of a resolved sense.
                contexts = [line for line in lesson["reader"] if ja in line["ja"]]
                occurrences[(ja, en)].append({
                    "lessonId": stable_id,
                    "cardIndex": index,
                    "candidateReaderContext": contexts[0] if contexts else None,
                })

    senses = []
    ids = set()
    headwords = defaultdict(list)
    english = defaultdict(list)
    for (ja, en), uses in sorted(occurrences.items()):
        digest = hashlib.sha256((ja + "\0" + en).encode("utf-8")).hexdigest()[:20]
        sense_id = f"ja-roofing-{digest}"
        assert sense_id not in ids
        ids.add(sense_id)
        senses.append({
            "id": sense_id,
            "ja": ja,
            "en": en,
            "reviewed": False,
            "qualifiedJapaneseReviewRequired": True,
            "uses": uses,
        })
        headwords[ja].append((en, sense_id))
        english[en].append((ja, sense_id))

    headword_conflicts = []
    for ja, values in sorted(headwords.items()):
        if len(values) < 2:
            continue
        glosses = [en for en, _ in values]
        headword_conflicts.append({
            "ja": ja,
            "englishGlosses": glosses,
            "senseIds": [sense_id for _, sense_id in values],
            "articleOnlyVariant": len({strip_article(en) for en in glosses}) == 1,
            "resolved": False,
        })
    english_conflicts = [{
        "en": en,
        "japaneseHeadwords": [ja for ja, _ in values],
        "senseIds": [sense_id for _, sense_id in values],
        "resolved": False,
    } for en, values in sorted(english.items()) if len(values) > 1]

    return {
        "schema": 1,
        "scope": "private-japanese-roofing-60-draft-lessons",
        "pairKey": "Japanese:English",
        "reviewed": False,
        "runtimeRegistered": False,
        "draftFileSHA256": hashes,
        "lessonCounts": COUNTS,
        "cardPlacements": sum(len(v) for v in occurrences.values()),
        "exactPairCount": len(senses),
        "uniqueJapaneseHeadwords": len(headwords),
        "ambiguousJapaneseHeadwords": len(headword_conflicts),
        "articleOnlyVariants": sum(x["articleOnlyVariant"] for x in headword_conflicts),
        "multipleJapaneseHeadwordsPerEnglishGloss": len(english_conflicts),
        "senses": senses,
        "unresolvedJapaneseHeadwords": headword_conflicts,
        "unresolvedEnglishGlosses": english_conflicts,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text(encoding="utf-8") == encoded, "Japanese Roofing dictionary candidate is stale"
        print("Japanese Roofing exact-pair dictionary candidate matches 60 private draft lessons")
    else:
        OUTPUT.write_text(encoded, encoding="utf-8")
        print(OUTPUT)
