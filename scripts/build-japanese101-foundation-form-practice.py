#!/usr/bin/env python3
"""Build private, exact-pair Japanese 101 Foundation form prompts."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-basics/foundation.json"
OUTPUT = ROOT / "content/japanese-basics/private-form-practice-foundation-1-10-ja-en.json"

# Author-selected source dialogue turns. Each focus is a form taught in that lesson.
SELECTED = {
    1: [(2, "topic-wa-desu"), (3, "question-ka"), (5, "polite-greeting")],
    2: [(1, "kore-wa"), (3, "kono-no"), (6, "location-no")],
    3: [(1, "bound-counter-satsu"), (3, "general-counter-mo"), (5, "plural-context")],
    4: [(1, "polite-donata"), (3, "name-san-question"), (4, "omitted-subject")],
    5: [(2, "origin-kara"), (3, "origin-question"), (6, "identifying-ga")],
    6: [(1, "person-imasu"), (3, "object-arimasu"), (6, "animal-imasu")],
    7: [(1, "thing-nani-ga"), (2, "thing-arimasu"), (4, "person-dare-ga"), (5, "person-imasu")],
    8: [(1, "people-counter-question"), (2, "two-people"), (3, "general-counter-question"), (6, "age-question"), (7, "eighteen-years-old")],
    9: [(1, "polite-question-ka"), (2, "negative-arimasen"), (3, "possessive-question"), (4, "negative-noun"), (5, "polite-verb-question"), (6, "negative-wakarimasen")],
    10: [(1, "question-ga-arimasu"), (3, "negative-wakarimasen"), (4, "repeat-request"), (5, "polite-hanashimasu"), (6, "past-wakarimashita")],
}


def stable_id(*parts):
    return "form-ja-en-" + hashlib.sha256("\0".join(map(str, parts)).encode()).hexdigest()[:16]


def split_pair(value):
    japanese, english = value.split("|", 1)
    assert japanese.strip() and english.strip()
    return japanese, english


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert (source["target"], source["native"], source["reviewed"], source["stage"]) == (
        "Japanese", "English", False, "foundation"
    )
    assert len(source["lessons"]) == len(SELECTED) == 10
    ids, lessons = set(), []
    for n, selected in SELECTED.items():
        lesson = source["lessons"][n - 1]
        module_id = "foundation-japanese-basics"
        assert len(lesson["dialogue"]) >= max(turn for turn, _ in selected)
        assert len({turn for turn, _ in selected}) == len(selected)
        prompts = []
        for turn, focus in selected:
            ja, en = split_pair(lesson["dialogue"][turn - 1])
            prompt_id = stable_id(module_id, n, turn, ja, en)
            assert prompt_id not in ids
            ids.add(prompt_id)
            prompts.append({
                "id": prompt_id, "pairKey": "Japanese:English",
                "source": "aligned-dialogue", "sourceDialogueTurn": turn,
                "focus": focus, "japaneseAnswer": ja, "englishPrompt": en,
                "knownJapaneseVariants": [ja],
                "practice": ["recognize-meaning", "produce-target"],
                "reviewed": False,
            })
        lessons.append({
            "lesson": n, "moduleId": module_id,
            "focus": lesson["focus"], "prompts": prompts, "reviewed": False,
        })
    assert len(ids) == 38
    return {
        "schema": 1, "state": "private-form-practice-draft",
        "pairKey": "Japanese:English", "courseId": "japanese-basics:ja-en",
        "registered": False, "reviewed": False,
        "sourceFile": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "counts": {"lessons": len(lessons), "alignedDialoguePrompts": len(ids), "authoredContrasts": 0},
        "lessons": lessons,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "Japanese 101 Foundation form practice is stale"
        print("Japanese 101 Foundation 1–10 exact form prompts and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
