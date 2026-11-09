#!/usr/bin/env python3
"""Build a private, lesson-linked Japanese 101 Foundation script sequence."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-basics/foundation.json"
OUT = ROOT / "content/japanese-basics/private-foundation-script-ja-en.json"

# Each example is (source lesson, exact term index). New script symbols are
# authored separately: a lesson term need not contain every symbol in its unit.
UNITS = [
    ("Hiragana vowels", "あいうえお", [(1, 0), (1, 1)], "Read the five vowel signs aloud, then find お in おはようございます."),
    ("K and S rows", "かきくけこさしすせそ", [(2, 0), (2, 1)], "Find こ in これ and そ in それ; distinguish さ from き."),
    ("T and N rows; first katakana", "たちつてとなにぬねの", [(3, 4), (2, 4)], "Read な in なまえ and ん in ほん. Notice that ノート begins in katakana."),
    ("H and M rows", "はひふへほまみむめも", [(4, 1), (4, 2)], "Compare は in わたし with ほ in ほん; read せんせい as a whole word."),
    ("Y, R, W, and ん", "やゆよらりるれろわをん", [(5, 5), (4, 1)], "Read わたし and から; the written particle を is pronounced お in its particle use."),
    ("Voiced kana and small っ", "がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽっ", [(6, 8), (3, 2)], "Find the small っ in みっつ from Foundation 3; find が in がくせい from Foundation 4."),
    ("Small ゃゅょ and long vowels", "ゃゅょ", [(7, 0), (1, 8)], "Read なに; find the long vowel in ありがとうございます, then preview きゅう in the next lesson."),
    ("Counters and written age", "", [(8, 10), (8, 11)], "Read ふたり and さい in kana first; the linked kanji bridge shows 二人 and 歳."),
    ("Question endings and negation", "", [(9, 2), (9, 6)], "Read ありますか with the question ending か, then わかりません with ません."),
    ("Repair phrases and mixed-script review", "", [(10, 0), (10, 3)], "Read もういちど and わかりません; return to ノート and ドア for katakana recognition."),
]


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    if (source.get("target"), source.get("native"), source.get("reviewed")) != ("Japanese", "English", False):
        raise ValueError("Foundation source must be the unreviewed Japanese:English pair")
    if len(source["lessons"]) != len(UNITS):
        raise ValueError("Foundation lesson count changed")
    entries = []
    for number, (focus, symbols, refs, instruction) in enumerate(UNITS, 1):
        examples = []
        for ref_number, index in refs:
            if ref_number > number:
                raise ValueError("Script unit cannot cite a later lesson")
            kana, english = source["lessons"][ref_number - 1]["terms"][index].split("|", 1)
            examples.append({"sourceLessonKey": f"foundation-japanese-basics:{ref_number}",
                             "sourceTermIndex": index, "kana": kana, "english": english})
        entries.append({"id": f"ja101-script:foundation:{number}",
                        "sourceLessonKey": f"foundation-japanese-basics:{number}",
                        "focus": focus, "newHiragana": symbols,
                        "examples": examples, "readingTask": instruction,
                        "reviewed": False})
    return {"schema": 1, "pairKey": "Japanese:English", "registered": False,
            "reviewed": False, "sourceFile": "content/japanese-basics/foundation.json",
            "sourceSha256": hashlib.sha256(raw).hexdigest(), "lessonCount": len(entries),
            "lessons": entries}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUT.exists() or OUT.read_text() != rendered:
            raise SystemExit("Japanese 101 Foundation script sequence needs regeneration")
    else:
        OUT.write_text(rendered)
    print("Japanese 101 private Foundation script sequence: 10 lesson-linked units")
