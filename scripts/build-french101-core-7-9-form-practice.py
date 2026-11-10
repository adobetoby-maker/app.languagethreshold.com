#!/usr/bin/env python3
"""Build private Core 7–9 French aller and question-form practice."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-basics/private-runtime-core-1-30.json"
OUTPUT = ROOT / "content/french-basics/private-form-practice-core-7-9-fr-en.json"

READER_TURNS = {
    7: [(1, "je-vais-au"), (3, "nous-allons-au"), (5, "plural-vont-au")],
    8: [(1, "qu-est-ce-que"), (3, "quel-cours"), (5, "que-signifie"), (6, "lequel-de")],
    9: [(1, "ou-inversion"), (3, "quand"), (5, "pourquoi"), (6, "parce-que-answer")],
}

# Distinct French constructions taught by the source grammar notes but absent
# from the aligned Reader are authored here as unreviewed bilingual pairs.
AUTHORED_CONTRASTS = {
    7: [
        ("Vous allez à l’école ?", "Are you going to school?", "formal-vous-allez-a-l"),
        ("Ils vont aux magasins.", "They are going to the shops.", "plural-aux"),
    ],
    8: [
        ("Quelle est ta matière préférée ?", "What is your favorite subject?", "feminine-quelle"),
    ],
    9: [
        ("Où est-ce que tu étudies d’habitude ?", "Where do you usually study?", "ou-est-ce-que"),
        ("Quand est-ce que le cours commence ?", "When does the class start?", "quand-est-ce-que"),
        ("Pourquoi est-ce que tu étudies le français ?", "Why do you study French?", "pourquoi-est-ce-que"),
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
    assert list(READER_TURNS) == list(AUTHORED_CONTRASTS) == [7, 8, 9]
    lessons = []
    all_ids = set()
    for n in (7, 8, 9):
        lesson, overlay = curriculum[n - 1], support[n - 1]
        stable_key = f"french-basics:{n}"
        assert lesson["n"] == overlay["n"] == n and overlay["stableLessonKey"] == stable_key
        reader = overlay["reader"]
        assert (reader["language"], reader["nativeLanguage"]) == ("French", "English")
        assert len(reader["target"]) == len(reader["native"]) >= 6
        notes = overlay["grammarNotes"]
        model = notes["model"]
        if n == 7:
            assert model["je"] == "je vais au parc"
            assert model["vous"] == "vous allez à l’école"
            assert model["ils_elles"] == "ils vont aux magasins"
        elif n == 8:
            assert model["what_study"] == "Qu’est-ce que tu étudies ce semestre ?"
            assert model["which_one"] == "Lequel de ces livres préfères-tu ?"
            assert "Quelle est ta matière préférée ?" in notes["explanation"]
        else:
            assert model["where"].startswith("Où étudies-tu ?")
            assert model["why"].startswith("Pourquoi étudies-tu le français ?")
            assert "est-ce que" in notes["explanation"]
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
            # The same English question can deliberately cue the Reader's
            # inversion form or the newly authored est-ce que alternative.
            assert fr not in reader["target"]
            assert fr.strip() and en.strip()
            prompt_id = stable_id(stable_key, "authored-contrast", fr, en)
            assert prompt_id not in all_ids
            all_ids.add(prompt_id)
            prompts.append({
                "id": prompt_id, "source": "authored-draft-contrast",
                "focus": focus, "frenchAnswer": fr, "englishPrompt": en,
                "practice": ["recognize-meaning", "produce-target"], "reviewed": False,
            })
        # These are known examples, not an exhaustive answer key. The three
        # Core 9 question prompts intentionally have two valid source-linked
        # French forms for the same English meaning.
        for prompt in prompts:
            prompt["knownFrenchVariants"] = sorted({
                other["frenchAnswer"] for other in prompts
                if other["englishPrompt"] == prompt["englishPrompt"]
            })
        lessons.append({
            "lesson": n, "stableLessonKey": stable_key, "grammarModel": model,
            "prompts": prompts, "reviewed": False,
        })
    assert len(all_ids) == 17
    assert all(len(prompt["knownFrenchVariants"]) == 2 for prompt in lessons[2]["prompts"]
               if prompt["englishPrompt"] in {
                   "Where do you usually study?", "When does the class start?", "Why do you study French?"})
    return {
        "schema": 1, "state": "private-form-practice-draft", "pairKey": "French:English",
        "courseId": "french-basics:fr-en", "registered": False, "reviewed": False,
        "sourceFile": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "counts": {"lessons": len(lessons), "alignedReaderPrompts": 11,
                   "newAuthoredContrasts": 6, "totalPrompts": len(all_ids), "grammarModels": 3},
        "lessons": lessons,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "French 101 Core 7–9 form practice is stale"
        print("French 101 Core 7–9 contextual form practice and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
