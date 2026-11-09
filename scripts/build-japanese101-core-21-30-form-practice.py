#!/usr/bin/env python3
"""Build private, exact-pair Japanese 101 Core 21–30 form prompts."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-basics/core.json"
OUTPUT = ROOT / "content/japanese-basics/private-form-practice-core-21-30-ja-en.json"

SELECTED = {
    21: [(1, "result-state-shitteimasu"), (2, "negative-shirimasen"), (3, "understand-wakarimasu"), (5, "potential-ikemasu"), (6, "potential-question")],
    22: [(1, "comparison-yori"), (3, "which-of-two-dochira"), (4, "preferred-hou-ga"), (5, "superlative-ichiban")],
    23: [(1, "direct-object-wo"), (2, "additional-object-mo"), (3, "object-wo-progressive"), (6, "object-mo-past-question")],
    24: [(1, "give-ageru-ni"), (2, "give-to-me-kureru"), (3, "receive-from-morau"), (4, "give-to-aki")],
    25: [(1, "meet-person-ni"), (2, "call-person-wo"), (4, "go-to-person-no-tokoro-ni"), (5, "help-offer-mashouka")],
    26: [(1, "invitation-masenka"), (3, "past-question-mashitaka"), (4, "completed-mashita"), (6, "invitation-with-context")],
    27: [(1, "past-question-mashitaka"), (2, "past-negative-masendeshita"), (6, "noun-past-negative"), (7, "i-adjective-past-question"), (8, "i-adjective-past-negative")],
    28: [(2, "habit-yoku-past"), (4, "habit-itsumo-past"), (6, "single-event-kinou"), (8, "present-tokidoki")],
    29: [(1, "purpose-stem-ni"), (2, "purpose-noun-no-tame-ni"), (4, "reason-kara"), (5, "reason-node")],
    30: [(1, "plain-before-yotei"), (2, "contrast-demo"), (3, "result-dakara"), (7, "future-plan-yotei")],
}


def stable_id(*parts):
    return "form-ja-en-" + hashlib.sha256("\0".join(map(str, parts)).encode()).hexdigest()[:16]


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert (source["target"], source["native"], source["reviewed"], source["stage"]) == (
        "Japanese", "English", False, "core"
    )
    assert len(source["lessons"]) == 30 and list(SELECTED) == list(range(21, 31))
    ids, lessons = set(), []
    for n, selected in SELECTED.items():
        lesson = source["lessons"][n - 1]
        assert len(lesson["dialogue"]) >= max(turn for turn, _ in selected)
        assert len({turn for turn, _ in selected}) == len(selected)
        prompts = []
        for turn, focus in selected:
            ja, en = lesson["dialogue"][turn - 1].split("|", 1)
            assert ja.strip() and en.strip()
            prompt_id = stable_id("japanese-basics", n, turn, ja, en)
            assert prompt_id not in ids
            ids.add(prompt_id)
            prompts.append({
                "id": prompt_id, "pairKey": "Japanese:English",
                "source": "aligned-dialogue", "sourceDialogueTurn": turn,
                "focus": focus, "japaneseAnswer": ja, "englishPrompt": en,
                "knownJapaneseVariants": [ja],
                "practice": ["recognize-meaning", "produce-target"], "reviewed": False,
            })
        lessons.append({
            "lesson": n, "moduleId": "japanese-basics",
            "focus": lesson["focus"], "prompts": prompts, "reviewed": False,
        })
    assert len(ids) == 42
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
        assert OUTPUT.read_text() == rendered, "Japanese 101 Core 21–30 form practice is stale"
        print("Japanese 101 Core 21–30 exact form prompts and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
