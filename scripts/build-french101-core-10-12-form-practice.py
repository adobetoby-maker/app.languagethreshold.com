#!/usr/bin/env python3
"""Build source-pinned, private form practice for French 101 Core 10–12."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-basics/private-runtime-core-1-30.json"
OUTPUT = ROOT / "content/french-basics/private-form-practice-core-10-12-fr-en.json"

FOCUS = {
    10: ["il-est-clock", "a-scheduled-hour", "a-one-hour", "a-afternoon", "a-closing-hour", "a-quelle-heure"],
    11: ["j-aime", "third-person-aime", "nous-aimons-infinitive", "negated-aime", "tu-aimes", "j-aime-infinitive"],
    12: ["je-veux", "third-person-veut", "nous-voulons", "third-person-veut-buy", "plural-veulent", "tu-veux"],
}
CONTRASTS = {
    10: [
        ("Il est une heure.", "It is one o'clock.", "singular-clock-hour"),
        ("Il est deux heures.", "It is two o'clock.", "plural-hour-singular-verb"),
    ],
    11: [
        ("Vous aimez la musique ?", "Do you like music?", "formal-vous-aimez"),
        ("Ils aiment les livres.", "They like books.", "plural-ils-aiment"),
    ],
    12: [
        ("Vous voulez manger ensemble ?", "Do you want to eat together?", "formal-vous-voulez"),
        ("Elles veulent aller au parc.", "They want to go to the park.", "plural-elles-veulent"),
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
    for n in (10, 11, 12):
        lesson, overlay = curriculum[n - 1], support[n - 1]
        stable_key = f"french-basics:{n}"
        assert lesson["n"] == overlay["n"] == n
        assert overlay["stableLessonKey"] == stable_key
        reader = overlay["reader"]
        assert (reader["language"], reader["nativeLanguage"]) == ("French", "English")
        assert len(reader["target"]) == len(reader["native"]) == len(FOCUS[n]) == 6
        notes = overlay["grammarNotes"]
        model = notes["model"]
        if n == 10:
            assert model["one"] == "Il est une heure."
            assert "never say ils sont huit heures" in notes["explanation"]
        elif n == 11:
            assert model["one"] == "J’aime la musique."
            assert "vous aimez" in notes["explanation"] and "ils/elles aiment" in notes["explanation"]
        else:
            assert model["we"] == "Nous voulons manger ensemble."
            assert "vous voulez" in notes["explanation"] and "ils/elles veulent" in notes["explanation"]
        prompts = []
        for turn, (fr, en, focus) in enumerate(zip(reader["target"], reader["native"], FOCUS[n]), 1):
            assert fr.strip() and en.strip()
            prompt_id = stable_id(stable_key, "reader", turn, fr, en)
            assert prompt_id not in ids
            ids.add(prompt_id)
            prompts.append({
                "id": prompt_id, "source": "aligned-reader", "sourceReaderTurn": turn,
                "focus": focus, "frenchAnswer": fr, "englishPrompt": en,
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
            "lesson": n, "stableLessonKey": stable_key, "grammarModel": model,
            "prompts": prompts, "reviewed": False,
        })
    assert len(ids) == 24
    return {
        "schema": 1, "state": "private-form-practice-draft", "pairKey": "French:English",
        "courseId": "french-basics:fr-en", "registered": False, "reviewed": False,
        "sourceFile": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "counts": {"lessons": 3, "alignedReaderPrompts": 18,
                   "newAuthoredContrasts": 6, "totalPrompts": len(ids), "grammarModels": 3},
        "lessons": lessons,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "French 101 Core 10–12 form practice is stale"
        print("French 101 Core 10–12 contextual form practice and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
