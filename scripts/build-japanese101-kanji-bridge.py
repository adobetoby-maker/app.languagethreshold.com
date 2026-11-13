#!/usr/bin/env python3
"""Build a private kana-to-kanji bridge from existing Japanese 101 terms."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/japanese-basics/private-kanji-bridge-ja-en.json"

# Stage-local lesson, zero-based term index, ruby segments, and context note.
# The kana/English pair is always copied from the authored lesson source.
SPECS = {
    "foundation": [
        (8, 10, [("二人", "ふたり")], "二人 is read ふたり, an irregular people count."),
        (8, 11, [("歳", "さい")], "歳 marks age after a number; the spoken form here is さい."),
    ],
    "core": [
        (10, 0, [("一時", "いちじ")], "時 is read じ in this one-o’clock expression."),
        (10, 9, [("十分", "じゅっぷん")], "Here 十分 means ten minutes and is read じゅっぷん."),
        (10, 8, [("何時", "なんじ")], "In this clock-time question, 何時 is read なんじ."),
        (11, 0, [("好", "す"), ("き", None)], "好き expresses a liking; the liked item is commonly marked with が."),
        (11, 1, [("嫌", "きら"), ("い", None)], "嫌い expresses a dislike; it pairs with the same が pattern."),
        (18, 2, [("上", "うえ")], "上 names the position above or on something."),
        (18, 3, [("下", "した")], "下 names the position below or under something."),
        (18, 4, [("中", "なか")], "中 names the position inside something."),
        (21, 0, [("知", "し"), ("っています", None)], "知っています describes the state of knowing."),
        (21, 1, [("知", "し"), ("りません", None)], "知りません is the usual negative for not knowing."),
    ],
    "master": [
        (15, 2, [("行", "い"), ("ってください", None)], "行ってください asks someone to go; the destination context fixes 行."),
        (20, 1, [("言", "い"), ("ってください", None)], "言ってください asks someone to say it; the word context fixes 言."),
        (20, 0, [("資料", "しりょう")], "資料 names the materials or handout in this lesson."),
    ],
}


def source(stage):
    path = ROOT / f"content/japanese-basics/{stage}.json"
    raw = path.read_bytes()
    data = json.loads(raw)
    if data.get("target") != "Japanese" or data.get("native") != "English" or data.get("reviewed") is not False:
        raise ValueError(f"{stage}: wrong exact pair or review state")
    return data, hashlib.sha256(raw).hexdigest()


def build():
    sources = {}
    entries = []
    for stage, specs in SPECS.items():
        data, digest = source(stage)
        sources[stage] = {"path": f"content/japanese-basics/{stage}.json", "sha256": digest}
        for n, index, ruby, note in specs:
            if not 1 <= n <= len(data["lessons"]):
                raise ValueError(f"{stage}:{n}: missing lesson")
            terms = data["lessons"][n - 1]["terms"]
            if not 0 <= index < len(terms):
                raise ValueError(f"{stage}:{n}: missing term")
            kana, english = terms[index].split("|", 1)
            written = "".join(text for text, _ in ruby)
            reading = "".join(pronunciation or text for text, pronunciation in ruby)
            if reading != kana or not written or not english or not note:
                raise ValueError(f"{stage}:{n}:{index}: ruby does not match exact source kana")
            entries.append({
                "id": f"ja101-kanji:{stage}:{n}:{index}",
                "sourceLessonKey": f"{'foundation-' if stage == 'foundation' else 'master-' if stage == 'master' else ''}japanese-basics:{n}",
                "stage": stage,
                "lesson": n,
                "sourceTermIndex": index,
                "kana": kana,
                "written": written,
                "english": english,
                "ruby": [{"text": text, **({"reading": pronunciation} if pronunciation else {})} for text, pronunciation in ruby],
                "contextNote": note,
                "reviewed": False,
            })
    if len(entries) != 15 or len({entry["id"] for entry in entries}) != len(entries):
        raise ValueError("Kanji bridge count or IDs changed")
    return {
        "schema": 1,
        "pairKey": "Japanese:English",
        "registered": False,
        "reviewed": False,
        "sourceFiles": sources,
        "entryCount": len(entries),
        "entries": entries,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    text = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUT.is_file() or OUT.read_text() != text:
            raise SystemExit("Japanese 101 private kanji bridge needs regeneration")
    else:
        OUT.write_text(text)
    print("Japanese 101 private kanji bridge: 15 source-linked entries")
