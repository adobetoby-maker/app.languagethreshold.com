#!/usr/bin/env python3
"""Build private Core 1–3 French form practice from aligned Reader and authored contrasts."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-basics/private-runtime-core-1-30.json"
OUTPUT = ROOT / "content/french-basics/private-form-practice-core-1-3-fr-en.json"

# Exact Reader turns are chosen for the grammar contrast in each lesson.
READER_TURNS = {
    1: [(1, "je-etudie-elision"), (3, "nous-parlons"), (5, "plural-pratiquent")],
    2: [(1, "je-mange"), (2, "elle-mange"), (5, "plural-mangent")],
    3: [(1, "je-vis-exception"), (3, "nous-ecrivons-exception"), (5, "plural-recoivent-exception")],
}

# The Reader does not contain the model contrasts below. These are new authored
# French/English draft pairs, not quotations or claims of qualified review.
AUTHORED_CONTRASTS = {
    1: [
        ("Il parle à la bibliothèque.", "He talks in the library.", "singular-parle"),
        ("Ils parlent à la bibliothèque.", "They talk in the library.", "plural-parlent"),
    ],
    2: [
        ("Nous mangeons à la cafétéria.", "We eat at the cafeteria.", "nous-mangeons-spelling"),
    ],
    3: [
        ("Je finis mon message en français.", "I finish my message in French.", "je-finis"),
        ("Nous finissons nos messages en français.", "We finish our messages in French.", "nous-finissons"),
    ],
}


def stable_id(*parts):
    return "form-fr-en-" + hashlib.sha256("\0".join(map(str, parts)).encode()).hexdigest()[:16]


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert (source["privatePilot"], source["registered"], source["reviewed"]) == (True, False, False)
    assert (source["target"], source["native"]) == ("French", "English")
    curriculum = source["coreCurriculum"]["lessons"]
    support = source["support"]
    assert len(curriculum) == len(support) == 30
    assert list(READER_TURNS) == list(AUTHORED_CONTRASTS) == [1, 2, 3]
    lessons = []
    all_ids = set()
    for n in (1, 2, 3):
        lesson, overlay = curriculum[n - 1], support[n - 1]
        assert lesson["n"] == overlay["n"] == n
        stable_key = f"french-basics:{n}"
        assert overlay["stableLessonKey"] == stable_key
        reader = overlay["reader"]
        assert (reader["language"], reader["nativeLanguage"]) == ("French", "English")
        assert len(reader["target"]) == len(reader["native"]) >= 6
        notes = overlay["grammarNotes"]
        model = notes["model"]
        assert model["verb"] in ("parler", "manger", "finir")
        if n == 1:
            assert model["il_elle"] == "il/elle parle" and model["ils_elles"] == "ils/elles parlent"
        elif n == 2:
            assert model["nous"] == "nous mangeons"
        else:
            assert model["je"] == "je finis" and model["nous"] == "nous finissons"
        prompts = []
        for turn, focus in READER_TURNS[n]:
            fr = reader["target"][turn - 1]
            en = reader["native"][turn - 1]
            assert fr.strip() and en.strip()
            prompt_id = stable_id(stable_key, "reader", turn, fr, en)
            assert prompt_id not in all_ids
            all_ids.add(prompt_id)
            prompts.append({
                "id": prompt_id,
                "source": "aligned-reader",
                "sourceReaderTurn": turn,
                "focus": focus,
                "frenchAnswer": fr,
                "englishPrompt": en,
                "practice": ["recognize-meaning", "produce-target"],
                "reviewed": False,
            })
        for fr, en, focus in AUTHORED_CONTRASTS[n]:
            assert fr not in reader["target"] and en not in reader["native"]
            assert fr.strip() and en.strip()
            prompt_id = stable_id(stable_key, "authored-contrast", fr, en)
            assert prompt_id not in all_ids
            all_ids.add(prompt_id)
            prompts.append({
                "id": prompt_id,
                "source": "authored-draft-contrast",
                "focus": focus,
                "frenchAnswer": fr,
                "englishPrompt": en,
                "practice": ["recognize-meaning", "produce-target"],
                "reviewed": False,
            })
        lessons.append({
            "lesson": n,
            "stableLessonKey": stable_key,
            "grammarModel": model,
            "prompts": prompts,
            "reviewed": False,
        })
    assert ("Il parle à la bibliothèque.", "Ils parlent à la bibliothèque.") == tuple(
        x["frenchAnswer"] for x in lessons[0]["prompts"][-2:])
    assert lessons[1]["prompts"][-1]["frenchAnswer"].startswith("Nous mangeons ")
    assert ("Je finis mon message en français.", "Nous finissons nos messages en français.") == tuple(
        x["frenchAnswer"] for x in lessons[2]["prompts"][-2:])
    return {
        "schema": 1,
        "state": "private-form-practice-draft",
        "pairKey": "French:English",
        "courseId": "french-basics:fr-en",
        "registered": False,
        "reviewed": False,
        "sourceFile": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "counts": {
            "lessons": len(lessons),
            "alignedReaderPrompts": 9,
            "newAuthoredContrasts": 5,
            "totalPrompts": len(all_ids),
            "grammarModels": 3,
        },
        "lessons": lessons,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "French 101 Core 1–3 form practice is stale"
        print("French 101 Core 1–3 contextual form practice and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
