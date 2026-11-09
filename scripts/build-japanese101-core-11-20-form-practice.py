#!/usr/bin/env python3
"""Build private, exact-pair Japanese 101 Core 11–20 form prompts."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-basics/core.json"
OUTPUT = ROOT / "content/japanese-basics/private-form-practice-core-11-20-ja-en.json"

SELECTED = {
    11: [(1, "suki-ga-question"), (2, "suki-ga"), (5, "kirai"), (6, "suki-negative")],
    12: [(2, "want-question"), (3, "wanted-thing-ga-hoshii"), (4, "want-action-tai"), (5, "want-action-wo-tai")],
    13: [(1, "permission-te-mo-ii"), (2, "prohibition-te-wa-ikemasen"), (3, "potential-yomemasu"), (5, "potential-hairemasu")],
    14: [(2, "obligation-kawanakereba"), (4, "obligation-ikanaito"), (6, "suggestion-mashou")],
    15: [(1, "noun-shimasu-clean"), (2, "noun-shimasu-cook"), (4, "object-wo-study"), (5, "noun-shimasu-exercise")],
    16: [(1, "first-mazu"), (3, "then-sorekara"), (4, "seven-shichiji"), (5, "finally-saigoni")],
    17: [(1, "price-ikura"), (2, "two-hundred-nihyaku"), (4, "three-hundred-sanbyaku"), (5, "choice-kore")],
    18: [(1, "existence-location-ni"), (2, "action-location-de"), (3, "position-ue-ni"), (5, "position-naka-ni")],
    19: [(1, "intention-tsumori"), (3, "schedule-yotei"), (5, "intention-question")],
    20: [(1, "action-now-shiteimasu"), (2, "reading-yondeimasu"), (3, "drinking-nondeimasu"), (4, "waiting-matteimasu"), (5, "talking-hanashiteimasu")],
}


def stable_id(*parts):
    return "form-ja-en-" + hashlib.sha256("\0".join(map(str, parts)).encode()).hexdigest()[:16]


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert (source["target"], source["native"], source["reviewed"], source["stage"]) == (
        "Japanese", "English", False, "core"
    )
    assert len(source["lessons"]) == 30 and list(SELECTED) == list(range(11, 21))
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
    assert len(ids) == 39
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
        assert OUTPUT.read_text() == rendered, "Japanese 101 Core 11–20 form practice is stale"
        print("Japanese 101 Core 11–20 exact form prompts and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
