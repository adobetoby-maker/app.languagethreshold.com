#!/usr/bin/env python3
"""Build source-pinned, private French 101 Core 13–18 form practice."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-basics/private-runtime-core-1-30.json"
OUTPUT = ROOT / "content/french-basics/private-form-practice-core-13-18-fr-en.json"

GRAMMAR_ANCHORS = {
    13: ("nous pouvons", "ils peuvent"),
    14: ("J’ai besoin de réviser", "nous devons arriver"),
    15: ("vous faites", "ils font"),
    16: ("nous nous levons", "je ne me lève pas tôt"),
    17: ("cet ordinateur", "celle-là"),
    18: ("dans for inside", "sur for on top"),
}
CONTRASTS = {
    13: [
        ("Est-ce que je peux ouvrir la fenêtre ?", "May I open the window?", "je-peux-permission"),
        ("Vous pouvez parler à voix basse.", "You can speak quietly.", "formal-vous-pouvez"),
    ],
    14: [
        ("J’ai besoin d’un cahier.", "I need a notebook.", "besoin-d-apostrophe"),
        ("Nous devons finir les devoirs.", "We have to finish the homework.", "devoir-infinitive"),
    ],
    15: [
        ("Vous faites du sport après le cours ?", "Do you exercise after class?", "formal-vous-faites"),
        ("Ils font leurs devoirs à la bibliothèque.", "They do their homework in the library.", "plural-ils-font"),
    ],
    16: [
        ("Nous nous levons à sept heures.", "We get up at seven.", "nous-nous-levons"),
        ("Je ne me lève pas tôt.", "I do not get up early.", "negated-reflexive"),
    ],
    17: [
        ("Cet ordinateur est pour le cours.", "This computer is for class.", "cet-before-vowel"),
        ("Je veux cette table-ci, pas celle-là.", "I want this table, not that one.", "feminine-celle-la"),
    ],
    18: [
        ("Le livre est sur la table.", "The book is on the table.", "sur-on-top"),
        ("Le sac à dos est dans la salle de cours.", "The backpack is in the classroom.", "dans-inside"),
    ],
}


def stable_id(*parts):
    return "form-fr-en-" + hashlib.sha256("\0".join(map(str, parts)).encode()).hexdigest()[:16]


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert (source["privatePilot"], source["registered"], source["reviewed"]) == (True, False, False)
    assert (source["target"], source["native"]) == ("French", "English")
    curriculum, support = source["coreCurriculum"]["lessons"], source["support"]
    assert len(curriculum) == len(support) == 30
    lessons, ids = [], set()
    for n in range(13, 19):
        lesson, overlay = curriculum[n - 1], support[n - 1]
        stable_key = f"french-basics:{n}"
        assert lesson["n"] == overlay["n"] == n
        assert overlay["stableLessonKey"] == stable_key
        reader = overlay["reader"]
        assert (reader["language"], reader["nativeLanguage"]) == ("French", "English")
        assert len(reader["target"]) == len(reader["native"]) == 6
        notes = overlay["grammarNotes"]
        for anchor in GRAMMAR_ANCHORS[n]:
            assert anchor in notes["explanation"] or anchor in notes["caution"]
        prompts = []
        for turn, (fr, en) in enumerate(zip(reader["target"], reader["native"]), 1):
            assert fr.strip() and en.strip()
            prompt_id = stable_id(stable_key, "reader", turn, fr, en)
            assert prompt_id not in ids
            ids.add(prompt_id)
            prompts.append({
                "id": prompt_id, "source": "aligned-reader", "sourceReaderTurn": turn,
                "focus": f"reader-form-{turn}", "frenchAnswer": fr, "englishPrompt": en,
                "practice": ["recognize-meaning", "produce-target"], "reviewed": False,
            })
        for fr, en, focus in CONTRASTS[n]:
            assert fr not in reader["target"] and fr.strip() and en.strip()
            prompt_id = stable_id(stable_key, "authored-contrast", fr, en)
            assert prompt_id not in ids
            ids.add(prompt_id)
            prompts.append({
                "id": prompt_id, "source": "authored-draft-contrast",
                "focus": focus, "frenchAnswer": fr, "englishPrompt": en,
                "practice": ["recognize-meaning", "produce-target"], "reviewed": False,
            })
        for prompt in prompts:
            prompt["knownFrenchVariants"] = sorted({
                other["frenchAnswer"] for other in prompts
                if other["englishPrompt"] == prompt["englishPrompt"]
            })
        lessons.append({
            "lesson": n, "stableLessonKey": stable_key,
            "grammarModel": notes["model"], "prompts": prompts, "reviewed": False,
        })
    assert len(ids) == 48
    return {
        "schema": 1, "state": "private-form-practice-draft", "pairKey": "French:English",
        "courseId": "french-basics:fr-en", "registered": False, "reviewed": False,
        "sourceFile": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "counts": {"lessons": 6, "alignedReaderPrompts": 36,
                   "newAuthoredContrasts": 12, "totalPrompts": len(ids), "grammarModels": 6},
        "lessons": lessons,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "French 101 Core 13–18 form practice is stale"
        print("French 101 Core 13–18 contextual form practice and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
