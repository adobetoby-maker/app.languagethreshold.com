#!/usr/bin/env python3
"""Derive an unpublished Japanese/English Core 28–30 lesson bundle from pinned drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
SOURCE = CONTENT / "core-translation-28-30-draft.json"
OUTPUT = CONTENT / "core-runtime-pilot-28-30-ja-en.json"
COURSE_ID = "construction-foreman-ja-en"
MODES = ("see", "recall", "hear", "type", "say", "write")

LESSON_DETAILS = {
    28: {
        "title": "Hear two accounts fairly",
        "focus": "Use じじつ for a confirmed fact and すいそく for an assumption. Give each person はつげん の じゅんばん, then record only what both sides actually agree on.",
        "speaking": "Summarize both accounts of a disagreement neutrally, confirm what is agreed, and route unresolved concerns to the appropriate contact without deciding blame in advance.",
        "openingLine": "そうほう の いいぶん を ききたい です。ひとり ひとり の はつげん を そんちょう し、じゅんばん に はなしましょう。",
        "partnerRole": "A crew member who presents one account and helps distinguish observed facts from assumptions and unresolved concerns.",
        "checkAnswers": ("いけん の くいちがい", "すいそく", "フォローアップ"),
    },
    29: {
        "title": "Give a realistic team briefing",
        "focus": "Use もくひょう for a goal, リソース for resources, and みなおし for a review. Describe a priority with a realistic plan rather than an unsupported promise.",
        "speaking": "Explain the week's challenge and goal, ask what support is missing, acknowledge the crew's effort, and agree when to review progress.",
        "openingLine": "もくひょう には、げんじつてきな けいかく が ひつよう です。どんな リソース や サポート が たりて いませんか。",
        "partnerRole": "A crew member who names a resource gap or concern and confirms a realistic follow-up time.",
        "checkAnswers": ("ゆうせん じこう", "サポート", "きがかり"),
    },
    30: {
        "title": "Run a clear crew briefing",
        "focus": "Use しゅっせき かくにん for attendance and さぎょう ひきつぎ for work handoff. Summarize agreed details separately from unanswered questions; a practice briefing is not technical approval.",
        "speaking": "Confirm attendance, the site-plan contact, task handoffs and open questions, then have each crew member repeat what is confirmed and what still needs checking.",
        "openingLine": "まず しゅっせき かくにん から ミーティングを はじめましょう。まだ こたえが でて いない しつもんは どれですか。",
        "partnerRole": "A crew member who confirms their task and handoff, asks an unresolved question, and repeats the pending contact or check.",
        "checkAnswers": ("しゅっせき かくにん", "さぎょう ひきつぎ", "ごうい じこう"),
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
    assert [lesson["n"] for lesson in draft["lessons"]] == [28, 29, 30]
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
    print(f"Built private {COURSE_ID} Core 28–30: {len(bundle['cards'])} cards")
