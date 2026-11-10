#!/usr/bin/env python3
"""Build source-pinned private French 101 Core 19–30 form practice."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-basics/private-runtime-core-1-30.json"
OUTPUT = ROOT / "content/french-basics/private-form-practice-core-19-30-fr-en.json"

# New bilingual examples stay within each source lesson's grammar and vocabulary.
CONTRASTS = {
    19: [("Vous allez étudier le français demain ?", "Are you going to study French tomorrow?", "formal-near-future")],
    20: [("Ils sont en train d’écrire un message.", "They are writing a message.", "plural-progressive")],
    21: [("Nous savons où est le café.", "We know where the café is.", "plural-savoir-fact")],
    22: [("Cette table est plus grande que celle-là.", "This table is bigger than that one.", "comparative-plus-que")],
    23: [("Je trouve les cahiers et je les range.", "I find the notebooks and put them away.", "plural-direct-object-les")],
    24: [("Nous leur donnons les cahiers.", "We give them the notebooks.", "plural-recipient-leur")],
    25: [("Je la cherche.", "I am looking for her.", "person-direct-object-la")],
    26: [("Nous avons fini les devoirs.", "We finished the homework.", "past-participle-fini")],
    27: [("Ana est allée au musée.", "Ana went to the museum.", "feminine-allee")],
    28: [("Nous habitions près de l’école.", "We used to live near the school.", "imperfect-nous")],
    29: [("Nous passons par le parc.", "We pass through the park.", "route-par")],
    30: [("Nous allons réviser, mais la bibliothèque est fermée.", "We are going to review, but the library is closed.", "connector-mais")],
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
    assert list(CONTRASTS) == list(range(19, 31))
    lessons, ids = [], set()
    for n in range(19, 31):
        lesson, overlay = curriculum[n - 1], support[n - 1]
        stable_key = f"french-basics:{n}"
        assert lesson["n"] == overlay["n"] == n
        assert overlay["stableLessonKey"] == stable_key
        reader = overlay["reader"]
        assert (reader["language"], reader["nativeLanguage"]) == ("French", "English")
        assert len(reader["target"]) == len(reader["native"]) == 6
        notes = overlay["grammarNotes"]
        assert notes["explanation"] and notes["model"]
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
            "lesson": n, "stableLessonKey": stable_key, "grammarModel": notes["model"],
            "prompts": prompts, "reviewed": False,
        })
    assert len(ids) == 84
    return {
        "schema": 1, "state": "private-form-practice-draft", "pairKey": "French:English",
        "courseId": "french-basics:fr-en", "registered": False, "reviewed": False,
        "sourceFile": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "counts": {"lessons": 12, "alignedReaderPrompts": 72,
                   "newAuthoredContrasts": 12, "totalPrompts": len(ids), "grammarModels": 12},
        "lessons": lessons,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "French 101 Core 19–30 form practice is stale"
        print("French 101 Core 19–30 contextual form practice and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
