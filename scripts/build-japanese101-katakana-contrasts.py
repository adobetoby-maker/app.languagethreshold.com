#!/usr/bin/env python3
"""Build source-linked, private katakana contrast practice for Japanese 101."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/japanese-basics/private-katakana-contrasts-ja-en.json"

# These pairs are exact Japanese 101 term entries. The contrasts teach script
# features; they do not replace the original lesson text or its English meaning.
UNITS = [
    {
        "focus": "Sound marks: dakuten and handakuten",
        "examples": [("foundation", 7, 3, "ドア", "door"),
                     ("foundation", 3, 5, "けしゴム", "eraser"),
                     ("core", 5, 8, "ペン", "pen")],
        "activities": [
            ("recognize", "Which first sign appears in ドア: ト or ド?", "ド",
             "The two strokes on ド are dakuten; the source word is ドア.", 0),
            ("recognize", "Which sign in ペン has the small circle: ヘ or ペ?", "ペ",
             "The circle on ペ is handakuten; the source word is ペン.", 2),
            ("write", "Write the Japanese 101 source word for eraser.", "けしゴム",
             "ゴ carries dakuten in the mixed-script word けしゴム.", 1),
        ],
    },
    {
        "focus": "Small ュ in a contracted sound",
        "examples": [("core", 12, 6, "メニュー", "menu")],
        "activities": [
            ("recognize", "Which sign is small in メニュー: ユ or ュ?", "ュ",
             "The source word メニュー uses small ュ after ニ.", 0),
            ("write", "Write the Japanese 101 source word for menu.", "メニュー",
             "Keep the small ュ and the long-vowel mark ー.", 0),
        ],
    },
    {
        "focus": "Long-vowel mark ー",
        "examples": [("foundation", 3, 4, "ノート", "notebook"),
                     ("master", 1, 0, "グループ", "group")],
        "activities": [
            ("recognize", "Which sign extends the vowel in ノート?", "ー",
             "The source word ノート places ー after ノ.", 0),
            ("write", "Write the Japanese 101 source word for group.", "グループ",
             "Keep ー after ル in グループ.", 1),
        ],
    },
]


def build():
    sources = {}
    for stage in ("foundation", "core", "master"):
        path = ROOT / f"content/japanese-basics/{stage}.json"
        raw = path.read_bytes()
        source = json.loads(raw)
        if (source.get("target"), source.get("native"), source.get("reviewed")) != ("Japanese", "English", False):
            raise ValueError(f"{stage}: wrong pair or review state")
        sources[stage] = (source, hashlib.sha256(raw).hexdigest())
    units = []
    for number, spec in enumerate(UNITS, 1):
        examples = []
        for index, (stage, lesson, term_index, kana, english) in enumerate(spec["examples"]):
            terms = sources[stage][0]["lessons"][lesson - 1]["terms"]
            if terms[term_index] != f"{kana}|{english}":
                raise ValueError(f"{stage}:{lesson}:{term_index}: source term changed")
            prefix = "" if stage == "core" else f"{stage}-"
            examples.append({"id": f"ja101-katakana-contrast:{number}:example:{index + 1}",
                             "sourceLessonKey": f"{prefix}japanese-basics:{lesson}",
                             "sourceTermIndex": term_index, "kana": kana, "english": english})
        activities = []
        for index, (mode, prompt, answer, explanation, example_index) in enumerate(spec["activities"]):
            if mode not in ("recognize", "write") or not answer or not prompt or not explanation:
                raise ValueError("Katakana contrast activity incomplete")
            activities.append({"id": f"ja101-katakana-contrast:{number}:activity:{index + 1}",
                               "mode": mode, "prompt": prompt, "answer": answer,
                               "explanation": explanation,
                               "sourceExampleId": examples[example_index]["id"]})
        units.append({"id": f"ja101-katakana-contrast-unit:{number}",
                      "focus": spec["focus"], "sourceExamples": examples,
                      "activities": activities, "reviewed": False})
    return {"schema": 1, "pairKey": "Japanese:English", "registered": False,
            "reviewed": False,
            "sourceFiles": {stage: {"path": f"content/japanese-basics/{stage}.json", "sha256": digest}
                            for stage, (_, digest) in sources.items()},
            "unitCount": len(units), "activityCount": sum(len(unit["activities"]) for unit in units),
            "units": units}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUT.exists() or OUT.read_text() != rendered:
            raise SystemExit("Japanese 101 katakana contrasts need regeneration")
    else:
        OUT.write_text(rendered)
    print("Japanese 101 private katakana contrasts: 3 units, 7 activities")
