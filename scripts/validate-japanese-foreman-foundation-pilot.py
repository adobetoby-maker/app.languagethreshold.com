#!/usr/bin/env python3
"""Validate private, source-aligned Japanese Foreman Foundation pilot drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/data/core60/es/foundation-construction-foreman.json"
PILOTS = (
    (1, 3, "foundation-source-1-3.json", "foundation-runtime-pilot-1-3.json"),
    (4, 6, "foundation-source-4-10.json", "foundation-runtime-pilot-4-6.json"),
    (7, 10, "foundation-source-4-10.json", "foundation-runtime-pilot-7-10.json"),
)
CONTENT = ROOT / "content/japanese-construction-foreman"


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    source = json.loads(SOURCE.read_text())
    source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    covered = []
    for first, last, pin_name, draft_name in PILOTS:
        pin = json.loads((CONTENT / pin_name).read_text())
        draft = json.loads((CONTENT / draft_name).read_text())
        check(pin["sourceSha256"] == source_hash, "English source changed")
        pin_first = pin["lessons"][0]["n"]
        pin_last = pin["lessons"][-1]["n"]
        check(pin["lessons"] == [{k: lesson[k] for k in ("n", "title", "objective", "focus", "words", "speaking")}
                                   for lesson in source["lessons"][pin_first - 1:pin_last]],
              f"Pinned English source differs for {first}–{last}")
        english_lessons = pin["lessons"][first - pin_first:last - pin_first + 1]
        check(draft["sourceSha256"] == source_hash, f"Draft source hash differs for {first}–{last}")
        check(draft["target"] == "Japanese" and draft["native"] == "English", "Wrong exact pair")
        check(draft["module"] == "foundation-construction-foreman", "Unstable module ID")
        check(draft["reviewed"] is False, "Human review must remain false")
        check(draft["state"] == "private-pilot-draft", "Pilot must remain private draft")
        check([lesson["n"] for lesson in draft["lessons"]] == list(range(first, last + 1)),
              f"Expected stage-local lessons {first}–{last}")
        covered.extend(lesson["n"] for lesson in draft["lessons"])
        for english, lesson in zip(english_lessons, draft["lessons"]):
            validate_lesson(english, lesson)
    check(covered == list(range(1, 11)), "Pilot coverage must be contiguous 1–10")
    print("Foreman Japanese Foundation 1–10: exact English source, pair, reading and cloze checks passed")


def validate_lesson(english, lesson):
        n = lesson["n"]
        check(lesson["sourceTitle"] == english["title"], f"Lesson {n}: source title drift")
        check(lesson["sourceObjective"] == english["objective"], f"Lesson {n}: source objective drift")
        source_words = [(w["en"], w["kind"]) for w in english["words"]]
        learner_words = [(w["en"], w["kind"]) for w in lesson["words"]]
        if n == 1:
            source_words = [(text.replace('in Spanish?', 'in Japanese?'), kind) for text, kind in source_words]
        if n == 10:
            source_words = [(
                text.replace('I speak a little Spanish.', 'I speak a little Japanese.')
                    .replace('What does "colar" mean?', 'What does "dasetsu" mean?'),
                kind,
            ) for text, kind in source_words]
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
            if n >= 7:
                check(item["hint"] in reading["native"],
                      f"Lesson {n}: cloze hint does not match an aligned English reading line")


if __name__ == "__main__":
    main()
