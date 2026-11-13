#!/usr/bin/env python3
"""Build a private katakana supplement for the Japanese→English core."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/japanese-basics/private-katakana-supplement-ja-en.json"

# Basic gojuon only; voiced signs, small kana, and the long-vowel mark are
# introduced separately through exact source examples, not counted as basic 46.
ROWS = [
    ("Vowels and K row", "あいうえおかきくけこ", [("foundation", 5, 1), ("foundation", 7, 3)],
     "Read ア in アメリカ and ドア; copy each vowel and its katakana partner."),
    ("S and T rows", "さしすせそたちつてと", [("foundation", 3, 4), ("core", 12, 5)],
     "Find ト in ノート and the small ュ in メニュー; the small kana is a preview, not a basic sign."),
    ("N and H rows", "なにぬねのはひふへほ", [("foundation", 3, 4), ("core", 5, 8)],
     "Find ノ in ノート; compare the basic ヘ with the voiced ペ in ペン."),
    ("M and Y rows", "まみむめもやゆよ", [("foundation", 3, 5), ("core", 12, 6)],
     "Find ム in けしゴム and メ in メニュー; the katakana word may contain other signs too."),
    ("R, W, and final N", "らりるれろわをん", [("foundation", 5, 1), ("master", 1, 0)],
     "Find リ in アメリカ and ル in グループ; distinguish ン from the similar-looking ソ."),
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
    for number, (focus, hiragana, refs, instruction) in enumerate(ROWS, 1):
        cards = []
        for i, sound in enumerate(hiragana):
            sign = chr(ord(sound) + 0x60)
            cards.append({"id": f"ja101-katakana:{number}:{i}", "hiragana": sound,
                          "katakana": sign,
                          "readPrompt": f"Read {sign} in hiragana.",
                          "writePrompt": f"Write the katakana for {sound}."})
        examples = []
        for stage, lesson, term_index in refs:
            source = sources[stage][0]
            kana, english = source["lessons"][lesson - 1]["terms"][term_index].split("|", 1)
            if not any("ァ" <= char <= "ヴ" for char in kana):
                raise ValueError("Katakana example lost its katakana")
            prefix = "" if stage == "core" else f"{stage}-"
            examples.append({"sourceLessonKey": f"{prefix}japanese-basics:{lesson}",
                             "sourceTermIndex": term_index, "kana": kana, "english": english})
        units.append({"id": f"ja101-katakana-unit:{number}", "focus": focus,
                      "cards": cards, "sourceExamples": examples,
                      "readingTask": instruction, "reviewed": False})
    all_cards = [card for unit in units for card in unit["cards"]]
    if len(all_cards) != 46 or len({card["katakana"] for card in all_cards}) != 46:
        raise ValueError("Basic katakana chart must contain exactly 46 unique signs")
    return {"schema": 1, "pairKey": "Japanese:English", "registered": False,
            "reviewed": False,
            "sourceFiles": {stage: {"path": f"content/japanese-basics/{stage}.json", "sha256": digest}
                            for stage, (_, digest) in sources.items()},
            "unitCount": len(units), "basicSignCount": len(all_cards), "units": units}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUT.exists() or OUT.read_text() != rendered:
            raise SystemExit("Japanese 101 katakana supplement needs regeneration")
    else:
        OUT.write_text(rendered)
    print("Japanese 101 private katakana supplement: 5 units, 46 basic signs")
