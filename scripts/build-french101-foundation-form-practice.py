#!/usr/bin/env python3
"""Build private French 101 Foundation form practice from selected bilingual Reader turns."""

import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-basics/private-runtime-foundation-1-10.json"
OUTPUT = ROOT / "content/french-basics/private-form-practice-foundation-1-10-fr-en.json"

# Author-selected turns track each lesson's grammar focus. They are neither random
# Reader samples nor Spanish conjugation slots copied into French.
EXERCISES = {
    1: [(1, "je-m-appelle-introduction"), (2, "formal-name-question"), (3, "je-m-appelle-reply")],
    2: [(2, "masculine-un-cahier"), (3, "feminine-une-trousse"), (6, "definite-la-gomme")],
    3: [(1, "definite-plural-les"), (2, "indefinite-plural-des"), (3, "ce-sont-plural")],
    4: [(1, "tu-es-question"), (3, "nous-sommes"), (7, "ils-sont")],
    5: [(1, "formal-vous-etes"), (3, "je-viens-de"), (5, "elle-est-feminine")],
    6: [(1, "ou-est-question"), (2, "il-est-sur"), (8, "je-suis-state")],
    7: [(1, "il-y-a-question"), (4, "il-y-a-plural"), (7, "il-n-y-a-pas-de")],
    8: [(1, "tu-as-age"), (2, "j-ai-age"), (5, "nous-avons-besoin-de")],
    9: [(2, "je-suis-affirmative"), (4, "elle-n-est-pas"), (6, "je-n-ai-pas-de")],
    10: [(1, "je-suis-introduction"), (4, "je-ne-comprends-pas"), (6, "tu-peux-repeter")],
}


def stable_id(*parts):
    return "form-fr-en-" + hashlib.sha256("\0".join(map(str, parts)).encode()).hexdigest()[:16]


def utterance(target):
    speaker_and_text = re.split(r"\s*:\s*", target, maxsplit=1)
    assert len(speaker_and_text) == 2 and all(speaker_and_text)
    return speaker_and_text[1].strip()


def build():
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)
    assert source["privatePilot"] is True and source["registered"] is False and source["reviewed"] is False
    stage = source["stageFile"]
    assert (stage["module"], stage["language"], stage["nativeLanguage"], stage["reviewed"]) == (
        "foundation-french-basics", "French", "English", False)
    assert [lesson["n"] for lesson in stage["lessons"]] == list(range(1, 11))
    assert [lesson["n"] for lesson in source["support"]] == list(range(1, 11))
    assert list(EXERCISES) == list(range(1, 11))
    lessons = []
    ids = set()
    for index, selected in EXERCISES.items():
        lesson, support = stage["lessons"][index - 1], source["support"][index - 1]
        assert support["stableLessonKey"] == f"foundation-french-basics:{index}"
        assert support["reader"]["language"] == "French" and support["reader"]["nativeLanguage"] == "English"
        pairs = support["reader"]["sentences"]
        prompts = []
        for turn, focus in selected:
            pair = pairs[turn - 1]
            target, english = pair["target"], pair["native"]
            answer = utterance(target)
            assert english and english == english.strip() and answer
            prompt_id = stable_id(support["stableLessonKey"], turn, target, english)
            assert prompt_id not in ids
            ids.add(prompt_id)
            prompts.append({
                "id": prompt_id,
                "sourceReaderTurn": turn,
                "focus": focus,
                "englishPrompt": english,
                "frenchAnswer": answer,
                "sourceReaderTarget": target,
                "practice": ["recognize-meaning", "produce-target"],
                "reviewed": False,
            })
        entry = {"lesson": index, "stableLessonKey": support["stableLessonKey"],
                 "grammarFocus": lesson["focus"], "prompts": prompts, "reviewed": False}
        if index == 4:
            # The six present forms are explicitly taught in this lesson's focus;
            # each form is authored here rather than inferred from a Spanish table.
            forms = {"je": "suis", "tu": "es", "il_elle": "est", "nous": "sommes",
                     "vous": "êtes", "ils_elles": "sont"}
            for pronoun, form in forms.items():
                assert f"{pronoun.replace('_', '/')} {form}" in lesson["focus"]
            entry["verbReference"] = {
                "infinitive": "être", "english": "to be", "tense": "present",
                "forms": forms,
                "sourceReaderTurn": 3,
                "exampleFrench": utterance(pairs[2]["target"]),
                "exampleEnglish": pairs[2]["native"],
                "reviewed": False,
            }
        lessons.append(entry)
    return {
        "schema": 1, "state": "private-form-practice-draft", "registered": False,
        "reviewed": False, "pairKey": "French:English", "courseId": "foundation-french-basics:fr-en",
        "practiceModel": "contextual-french-form",
        "note": "Authoring inputs only; neither a live learner trainer nor qualified French review.",
        "sourceFile": SOURCE.name, "sourceSha256": hashlib.sha256(source_bytes).hexdigest(),
        "counts": {"lessons": len(lessons), "contextualPrompts": len(ids), "verbReferences": 1},
        "lessons": lessons,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "French Foundation form practice is stale"
    else:
        OUTPUT.write_text(rendered)
    print("French 101 Foundation: 30 contextual prompts and one verb reference verified")


if __name__ == "__main__":
    main()
