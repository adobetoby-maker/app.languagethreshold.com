#!/usr/bin/env python3
"""Build private, exact-pair Japanese 101 Master 11–20 form prompts."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-basics/master.json"
OUTPUT = ROOT / "content/japanese-basics/private-form-practice-master-11-20-ja-en.json"

SELECTED = {
    11: [(1, "want-action-tai"), (6, "contains-result-state"), (7, "not-contained-teimasen"), (8, "two-item-order")],
    12: [(2, "condition-nara"), (3, "permission-te-mo-ii"), (6, "prohibition-te-wa-ikemasen"), (7, "suggestion-mashou")],
    13: [(1, "obligation-naito"), (2, "obligation-nakereba"), (6, "permission-question"), (8, "completed-dekimashita")],
    14: [(1, "usual-routine-fudan"), (3, "sequence-mazu"), (7, "changed-plan-yotei"), (10, "delay-result-state"), (14, "past-progressive-matteimashita")],
    15: [(1, "direction-te-kudasai"), (2, "turn-te-kudasai"), (4, "existence-floor-ni"), (5, "action-floor-de"), (7, "potential-ikemasu")],
    16: [(1, "now-yondeimasu"), (3, "intention-tsumori"), (4, "schedule-yotei"), (7, "not-yet-teimasen")],
    17: [(1, "ownership-context"), (4, "permission-show"), (7, "handover-te-kudasai"), (8, "clarification-question")],
    18: [(1, "completed-outing"), (7, "i-adjective-past"), (8, "partner-detail-check"), (9, "past-location-answer")],
    19: [(1, "habit-past-mainichi"), (3, "single-event-kinou"), (4, "past-progressive-reason"), (7, "present-habit-yoku")],
    20: [(4, "say-not-go-itte-kudasai"), (5, "quoted-word-check"), (7, "meeting-suggestion"), (8, "previous-meeting-past")],
}


def stable_id(*parts):
    return "form-ja-en-" + hashlib.sha256("\0".join(map(str, parts)).encode()).hexdigest()[:16]


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert (source["target"], source["native"], source["reviewed"], source["stage"]) == (
        "Japanese", "English", False, "master"
    )
    assert len(source["lessons"]) == 20 and list(SELECTED) == list(range(11, 21))
    ids, lessons = set(), []
    for n, selected in SELECTED.items():
        lesson = source["lessons"][n - 1]
        assert len(lesson["dialogue"]) >= max(turn for turn, _ in selected)
        assert len({turn for turn, _ in selected}) == len(selected)
        prompts = []
        for turn, focus in selected:
            ja, en = lesson["dialogue"][turn - 1].split("|", 1)
            assert ja.strip() and en.strip()
            prompt_id = stable_id("master-japanese-basics", n, turn, ja, en)
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
            "lesson": n, "moduleId": "master-japanese-basics",
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
        assert OUTPUT.read_text() == rendered, "Japanese 101 Master 11–20 form practice is stale"
        print("Japanese 101 Master 11–20 exact form prompts and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
