#!/usr/bin/env python3
"""Build private, exact-pair Japanese 101 Master 1–10 form prompts."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-basics/master.json"
OUTPUT = ROOT / "content/japanese-basics/private-form-practice-master-1-10-ja-en.json"

SELECTED = {
    1: [(4, "polite-past-mashita"), (6, "i-adjective-past-question"), (8, "intention-tsumori-question"), (10, "invitation-mashou")],
    2: [(1, "bound-counter-te-kudasai"), (2, "general-counter-hitsuyou"), (3, "need-question"), (4, "negative-irimasen")],
    3: [(2, "three-bound-books"), (3, "one-bound-book-recipient"), (5, "two-general-items-receive"), (6, "give-to-me-kureru")],
    4: [(1, "identity-desu"), (2, "resulting-state-tsukareteimasu"), (3, "person-location-imasu"), (5, "progressive-yondeimasu")],
    5: [(1, "object-arimasu"), (4, "person-imasu"), (6, "negative-imasen"), (8, "resulting-state-tsuiteimasu")],
    6: [(1, "meeting-place-de"), (2, "time-mashou"), (5, "route-object-wo"), (7, "potential-ikemasu")],
    7: [(1, "method-douyatte"), (4, "ask-person-ni"), (5, "method-question"), (8, "gradual-understanding")],
    8: [(3, "intention-tsumori"), (4, "quoted-reply-to"), (5, "quoted-write-to"), (6, "scheduled-yotei")],
    9: [(1, "demonstrative-price"), (4, "three-thousand-sanzen"), (5, "comparison-hou-ga"), (7, "which-of-two"), (8, "choice-object-wo")],
    10: [(1, "ownership-question"), (2, "negative-possession"), (6, "sequential-te-form"), (7, "quoted-possession")],
}


def stable_id(*parts):
    return "form-ja-en-" + hashlib.sha256("\0".join(map(str, parts)).encode()).hexdigest()[:16]


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert (source["target"], source["native"], source["reviewed"], source["stage"]) == (
        "Japanese", "English", False, "master"
    )
    assert len(source["lessons"]) == 20 and list(SELECTED) == list(range(1, 11))
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
    assert len(ids) == 41
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
        assert OUTPUT.read_text() == rendered, "Japanese 101 Master 1–10 form practice is stale"
        print("Japanese 101 Master 1–10 exact form prompts and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
