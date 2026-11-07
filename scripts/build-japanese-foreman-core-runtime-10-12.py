#!/usr/bin/env python3
"""Derive an unpublished Japanese/English Core 10–12 lesson bundle from pinned drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
SOURCE = CONTENT / "core-translation-10-12-draft.json"
OUTPUT = CONTENT / "core-runtime-pilot-10-12-ja-en.json"
COURSE_ID = "construction-foreman-ja-en"
MODES = ("see", "recall", "hear", "type", "say", "write")

LESSON_DETAILS = {
    10: {
        "title": "Read the measurement and unit",
        "focus": "Read the number with its unit: フィート/インチ or メートル/センチメートル. Distinguish ながさ (length), はば (width) and たかさ (height); ask for repetition when a fraction is unclear.",
        "speaking": "Read back a measurement with its unit, ask whether it is in feet or meters, and request confirmation. Do not guess a fraction or convert units without checking the document.",
        "openingLine": "すうちと たんいを いっしょに もういちど いって ください。",
        "partnerRole": "A crew member reading a measurement from a marked table who confirms the number, unit and dimension.",
        "checkAnswers": ("フィート", "たんい", "ぶんすう"),
    },
    11: {
        "title": "Confirm the revised schedule",
        "focus": "Use なんじに to ask a start time, かかる じかん for duration, and へんこう for a change. Distinguish a proposed schedule from the confirmed revised plan.",
        "speaking": "Explain a schedule change, name the affected start or break time, and ask each crew member to repeat back the revised time. Refer to the updated plan for priorities.",
        "openingLine": "スケジュールは けさ へんこうに なりました。さぎょうは なんじに はじまりますか。",
        "partnerRole": "A crew member who checks the revised plan, repeats back an assigned time and flags any unresolved delay.",
        "checkAnswers": ("スケジュール", "おくれ", "へんこう"),
    },
    12: {
        "title": "Report an electrical concern",
        "focus": "Use かくにん できません to say a status is unconfirmed and だれですか to identify the authorized person. たちいり せいげん means restricted entry; vocabulary practice is not electrical-work authorization.",
        "speaking": "Report an electrical concern and its location, say the circuit status is unconfirmed, and ask the authorized person to confirm the site procedure before anyone proceeds.",
        "openingLine": "かいろの じょうたいを かくにん できません。きょかを うけた ひとは だれですか。",
        "partnerRole": "The designated authorized contact who receives a concern and checks the documented site procedure; they do not invite unqualified learners to handle electrical equipment.",
        "checkAnswers": ("ぶんでんばん", "でんげん", "きょか"),
    },
}


def stable_id(prefix, *parts):
    digest = hashlib.sha256("\x1f".join(map(str, parts)).encode()).hexdigest()[:16]
    return f"{prefix}-{digest}"


def build():
    draft = json.loads(SOURCE.read_text())
    assert (draft["moduleId"], draft["target"], draft["native"], draft["stage"]) == (
        "construction-foreman", "Japanese", "English", "core"
    )
    assert draft["state"] == "translation-draft" and draft["reviewed"] is False
    assert [lesson["n"] for lesson in draft["lessons"]] == [10, 11, 12]
    lessons, cards, dictionary = [], [], []
    seen_pairs = set()
    for source in draft["lessons"]:
        n = source["n"]
        details = LESSON_DETAILS[n]
        lesson_id = f"{COURSE_ID}:lesson:{n}"
        words = []
        for word in source["terms"]:
            pair = (word["ja"], word["en"])
            card_id = stable_id("card-ja-en", COURSE_ID, *pair)
            words.append({"es": word["ja"], "en": word["en"], "kind": word["kind"], "cardId": card_id})
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                cards.append({"id": card_id, "courseId": COURSE_ID, "target": pair[0],
                              "native": pair[1], "kind": word["kind"], "firstLesson": n})
                dictionary.append({"id": stable_id("dict-ja-en", COURSE_ID, *pair),
                                   "courseId": COURSE_ID, "target": pair[0], "native": pair[1],
                                   "kind": word["kind"], "firstLesson": n})
        sentences = [{"target": line["ja"], "native": line["en"]} for line in source["reading"]]
        checks = []
        for line, answer in zip(sentences, details["checkAnswers"]):
            assert line["target"].count(answer) == 1, (n, answer, line["target"])
            checks.append({"prompt": line["target"].replace(answer, "____", 1),
                           "hint": line["native"], "answer": answer,
                           "explanation": f"{answer} appears in this lesson's reading."})
        lessons.append({
            "id": lesson_id, "n": n, "title": details["title"],
            "objective": source["objectiveEnglish"], "sourceObjective": source["objectiveEnglish"],
            "words": words, "modes": list(MODES),
            "reader": {"id": f"reader-{lesson_id}", "title": details["title"],
                       "sentences": sentences},
            "grammar": {"focus": details["focus"], "teachingNotesEnglish": source.get("teachingNotesEnglish", []),
                        "examples": [{"es": line["target"], "en": line["native"]}
                                     for line in sentences[:2]]},
            "speaking": {"id": f"speak-{lesson_id}", "summary": details["speaking"],
                         "openingLine": details["openingLine"],
                         "partnerRole": details["partnerRole"], "locale": "ja-JP"},
            "checks": checks, "reviewed": False,
        })
    return {
        "version": 1, "state": "private-runtime-draft", "reviewed": False,
        "courseId": COURSE_ID, "sourceModuleId": "construction-foreman",
        "baseModuleId": "construction-foreman", "target": "Japanese", "native": "English",
        "pairKey": "Japanese:English", "locale": "ja-JP",
        "sourceEnglishSubsetSha256": draft["englishSubsetSHA256"],
        "lessons": lessons, "cards": cards, "dictionary": dictionary,
    }


if __name__ == "__main__":
    bundle = build()
    OUTPUT.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n")
    print(f"Built private {COURSE_ID} Core 10–12: {len(bundle['cards'])} cards")
