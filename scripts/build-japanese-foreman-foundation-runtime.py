#!/usr/bin/env python3
"""Build a deterministic, unpublished ja-JP/en-US Foreman Foundation runtime bundle.

The output deliberately lives under content/, not the public Core 60 manifest or
app catalog. It can be promoted only after content, safety, audio and device gates.
"""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
SOURCES = (
    "foundation-runtime-pilot-1-3.json",
    "foundation-runtime-pilot-4-6.json",
    "foundation-runtime-pilot-7-10.json",
)
OUTPUT = CONTENT / "foundation-runtime-draft-ja-en.json"
COURSE_ID = "foundation-construction-foreman-ja-en"
PAIR = "Japanese:English"
MODES = ("see", "recall", "hear", "type", "say", "write")


def stable_id(prefix, *parts):
    digest = hashlib.sha256("\x1f".join(map(str, parts)).encode()).hexdigest()[:16]
    return f"{prefix}-{digest}"


def build():
    drafts = [json.loads((CONTENT / name).read_text()) for name in SOURCES]
    assert all(d["target"] == "Japanese" and d["native"] == "English" for d in drafts)
    assert all(d["reviewed"] is False and d["state"] == "private-pilot-draft" for d in drafts)
    assert len({d["sourceSha256"] for d in drafts}) == 1
    originals = [lesson for draft in drafts for lesson in draft["lessons"]]
    assert [lesson["n"] for lesson in originals] == list(range(1, 11))

    lessons = []
    cards = []
    dictionary = []
    seen_pairs = set()
    for lesson in originals:
        n = lesson["n"]
        lesson_id = f"{COURSE_ID}:lesson:{n}"
        words = []
        for word in lesson["words"]:
            pair = (word["es"], word["en"])
            card_id = stable_id("card-ja-en", COURSE_ID, *pair)
            words.append({**word, "cardId": card_id})
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                cards.append({"id": card_id, "courseId": COURSE_ID, "target": word["es"],
                              "native": word["en"], "kind": word["kind"], "firstLesson": n,
                              "reading": word.get("reading"), "note": word.get("note")})
                dictionary.append({"id": stable_id("dict-ja-en", COURSE_ID, *pair),
                                   "courseId": COURSE_ID, "target": word["es"],
                                   "native": word["en"], "kind": word["kind"],
                                   "reading": word.get("reading"), "usage": word.get("note"),
                                   "firstLesson": n})
        reading = lesson["reading"]
        sentences = [{"target": target, "native": reading["native"][i]}
                     for i, target in enumerate(reading["target"])]
        lessons.append({
            "id": lesson_id, "n": n, "title": lesson["title"],
            "objective": lesson["objective"], "sourceTitle": lesson["sourceTitle"],
            "sourceObjective": lesson["sourceObjective"], "words": words,
            "modes": list(MODES),
            "reader": {"id": f"reader-{lesson_id}", "title": reading["title"],
                       "sentences": sentences},
            "grammar": {"focus": lesson["focus"],
                        "examples": [{"es": item["target"], "en": item["native"]}
                                     for item in sentences[:2]]},
            "speaking": {"id": f"speak-{lesson_id}", "summary": lesson["speaking"],
                         "openingLine": lesson["openingLine"],
                         "partnerRole": lesson["partnerRole"], "locale": "ja-JP"},
            "checks": lesson["checks"], "reviewed": False,
        })
    return {
        "version": 1, "state": "private-runtime-draft", "reviewed": False,
        "courseId": COURSE_ID, "sourceModuleId": "foundation-construction-foreman",
        "baseModuleId": "construction-foreman", "target": "Japanese", "native": "English",
        "pairKey": PAIR, "locale": "ja-JP", "sourceSha256": drafts[0]["sourceSha256"],
        "lessons": lessons, "cards": cards, "dictionary": dictionary,
    }


if __name__ == "__main__":
    OUTPUT.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + "\n")
    print(f"Built private {COURSE_ID}: 10 lessons, {len(build()['cards'])} cards")
