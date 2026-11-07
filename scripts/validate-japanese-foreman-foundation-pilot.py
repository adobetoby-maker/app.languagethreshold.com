#!/usr/bin/env python3
"""Validate a private, source-aligned Japanese Foreman Foundation 1–3 draft."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/data/core60/es/foundation-construction-foreman.json"
PIN = ROOT / "content/japanese-construction-foreman/foundation-source-1-3.json"
DRAFT = ROOT / "content/japanese-construction-foreman/foundation-runtime-pilot-1-3.json"


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    source = json.loads(SOURCE.read_text())
    pin = json.loads(PIN.read_text())
    draft = json.loads(DRAFT.read_text())
    check(pin["sourceSha256"] == hashlib.sha256(SOURCE.read_bytes()).hexdigest(), "English source changed")
    check(pin["lessons"] == [{k: lesson[k] for k in ("n", "title", "objective", "focus", "words", "speaking")}
                               for lesson in source["lessons"][:3]], "Pinned English source differs")
    check(draft["target"] == "Japanese" and draft["native"] == "English", "Wrong exact pair")
    check(draft["module"] == "foundation-construction-foreman", "Unstable module ID")
    check(draft["reviewed"] is False, "Human review must remain false")
    check([lesson["n"] for lesson in draft["lessons"]] == [1, 2, 3], "Expected three stage-local lessons")
    for english, lesson in zip(pin["lessons"], draft["lessons"]):
        n = lesson["n"]
        check(lesson["sourceTitle"] == english["title"], f"Lesson {n}: source title drift")
        check(lesson["sourceObjective"] == english["objective"], f"Lesson {n}: source objective drift")
        source_words = [(w["en"], w["kind"]) for w in english["words"]]
        learner_words = [(w["en"], w["kind"]) for w in lesson["words"]]
        if n == 1:
            source_words = [(text.replace('in Spanish?', 'in Japanese?'), kind) for text, kind in source_words]
        check(learner_words == source_words, f"Lesson {n}: English word/phrase drift")
        for word in lesson["words"]:
            check(bool(word["es"].strip()) and any(ord(c) > 0x3000 for c in word["es"]),
                  f"Lesson {n}: missing Japanese for {word['en']}")
        reading = lesson["reading"]
        check(6 <= len(reading["target"]) == len(reading["native"]) <= 10,
              f"Lesson {n}: reading alignment/length")
        check(all(line.strip() for line in reading["target"] + reading["native"]),
              f"Lesson {n}: empty reading line")
        check(len(lesson["checks"]) >= 3, f"Lesson {n}: missing cloze checks")
        for item in lesson["checks"]:
            check(item["prompt"].count("____") == 1 and item["answer"].strip(),
                  f"Lesson {n}: invalid cloze")
            check(item["prompt"].replace("____", item["answer"]) in reading["target"],
                  f"Lesson {n}: cloze not in reading")
    print("Foreman Japanese Foundation 1–3: exact English source, pair, reading and cloze checks passed")


if __name__ == "__main__":
    main()
