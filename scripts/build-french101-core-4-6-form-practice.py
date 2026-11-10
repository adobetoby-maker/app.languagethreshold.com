#!/usr/bin/env python3
"""Build private Core 4–6 French agreement, possessive and avoir practice."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-basics/private-runtime-core-1-30.json"
OUTPUT = ROOT / "content/french-basics/private-form-practice-core-4-6-fr-en.json"

READER_TURNS = {
    4: [(1, "masculine-singular-rouge"), (2, "masculine-plural-rouges"),
        (3, "masculine-petit"), (5, "feminine-gentille")],
    5: [(1, "mon-sac"), (2, "mes-livres"), (3, "ton-cahier"), (5, "son-telephone")],
    6: [(1, "j-ai-faim"), (3, "nous-avons"), (5, "plural-ont"), (6, "tu-as")],
}

# The source grammar notes teach these contrasts but the aligned Reader does not.
AUTHORED_CONTRASTS = {
    4: [("La trousse bleue est petite.", "The blue pencil case is small.",
         "feminine-bleue-petite")],
    5: [("Ma table est ici.", "My table is here.", "feminine-ma"),
        ("Mon amie est ici.", "My friend is here.", "feminine-vowel-mon")],
    6: [("Vous avez de l'eau ?", "Do you have water?", "formal-vous-avez")],
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
    assert list(READER_TURNS) == list(AUTHORED_CONTRASTS) == [4, 5, 6]
    lessons = []
    all_ids = set()
    for n in (4, 5, 6):
        lesson, overlay = curriculum[n - 1], support[n - 1]
        stable_key = f"french-basics:{n}"
        assert lesson["n"] == overlay["n"] == n and overlay["stableLessonKey"] == stable_key
        reader = overlay["reader"]
        assert (reader["language"], reader["nativeLanguage"]) == ("French", "English")
        assert len(reader["target"]) == len(reader["native"]) >= 6
        model = overlay["grammarNotes"]["model"]
        if n == 4:
            assert model["masculine_singular"] == "un sac rouge"
            assert model["feminine_singular"] == "une trousse rouge"
            assert model["masculine_plural"] == "des sacs rouges"
        elif n == 5:
            assert model["first_singular"] == "mon cahier / ma table / mes livres"
            assert model["third_singular"] == "son téléphone / sa table / ses livres"
            assert "mon amie" in overlay["grammarNotes"]["explanation"]
        else:
            assert model["je"] == "j'ai" and model["nous"] == "nous avons"
            assert model["vous"] == "vous avez" and model["ils_elles"] == "ils/elles ont"
        prompts = []
        for turn, focus in READER_TURNS[n]:
            fr, en = reader["target"][turn - 1], reader["native"][turn - 1]
            assert fr.strip() and en.strip()
            prompt_id = stable_id(stable_key, "reader", turn, fr, en)
            assert prompt_id not in all_ids
            all_ids.add(prompt_id)
            prompts.append({
                "id": prompt_id, "source": "aligned-reader", "sourceReaderTurn": turn,
                "focus": focus, "frenchAnswer": fr, "englishPrompt": en,
                "practice": ["recognize-meaning", "produce-target"], "reviewed": False,
            })
        for fr, en, focus in AUTHORED_CONTRASTS[n]:
            assert fr not in reader["target"] and en not in reader["native"]
            assert fr.strip() and en.strip()
            prompt_id = stable_id(stable_key, "authored-contrast", fr, en)
            assert prompt_id not in all_ids
            all_ids.add(prompt_id)
            prompts.append({
                "id": prompt_id, "source": "authored-draft-contrast",
                "focus": focus, "frenchAnswer": fr, "englishPrompt": en,
                "practice": ["recognize-meaning", "produce-target"], "reviewed": False,
            })
        lessons.append({
            "lesson": n, "stableLessonKey": stable_key, "grammarModel": model,
            "prompts": prompts, "reviewed": False,
        })
    assert [p["frenchAnswer"] for p in lessons[0]["prompts"][-1:]] == ["La trousse bleue est petite."]
    assert [p["frenchAnswer"] for p in lessons[1]["prompts"][-2:]] == [
        "Ma table est ici.", "Mon amie est ici."]
    assert [p["frenchAnswer"] for p in lessons[2]["prompts"][-1:]] == ["Vous avez de l'eau ?"]
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
            "lessons": len(lessons), "alignedReaderPrompts": 12,
            "newAuthoredContrasts": 4, "totalPrompts": len(all_ids),
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
        assert OUTPUT.read_text() == rendered, "French 101 Core 4–6 form practice is stale"
        print("French 101 Core 4–6 contextual form practice and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
