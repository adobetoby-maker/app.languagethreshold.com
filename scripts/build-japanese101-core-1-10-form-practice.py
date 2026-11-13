#!/usr/bin/env python3
"""Build private, exact-pair Japanese 101 Core 1–10 form prompts."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-basics/core.json"
OUTPUT = ROOT / "content/japanese-basics/private-form-practice-core-1-10-ja-en.json"

SELECTED = {
    1: [(1, "polite-masu"), (2, "action-location-de"), (3, "companion-to"), (5, "also-mo")],
    2: [(1, "ru-verb-tabemasu"), (2, "u-verb-nomimasu"), (4, "irregular-kimasu"), (5, "irregular-shimasu")],
    3: [(1, "polite-past-mashita"), (3, "past-negative-masendeshita"), (4, "present-negative-masen")],
    4: [(1, "i-adjective"), (3, "na-adjective-before-noun"), (5, "kirei-na-adjective")],
    5: [(1, "possessive-no"), (3, "negative-i-adjective"), (7, "irregular-yokunai")],
    6: [(1, "possession-arimasu"), (3, "needed-hitsuyou"), (5, "needed-irimasu")],
    7: [(1, "go-ikimasu"), (2, "come-kimasu"), (4, "return-kaerimasu")],
    8: [(1, "what-nani"), (3, "which-noun-dono"), (5, "which-one-dore")],
    9: [(1, "when-itsu"), (3, "why-doushite"), (4, "because-kara"), (5, "where-doko-de")],
    10: [(1, "time-mashouka"), (2, "time-mashou"), (5, "half-hour-han")],
}


def stable_id(*parts):
    return "form-ja-en-" + hashlib.sha256("\0".join(map(str, parts)).encode()).hexdigest()[:16]


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert (source["target"], source["native"], source["reviewed"], source["stage"]) == (
        "Japanese", "English", False, "core"
    )
    assert len(source["lessons"]) == 30 and list(SELECTED) == list(range(1, 11))
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
    assert len(ids) == 33
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
        assert OUTPUT.read_text() == rendered, "Japanese 101 Core 1–10 form practice is stale"
        print("Japanese 101 Core 1–10 exact form prompts and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
