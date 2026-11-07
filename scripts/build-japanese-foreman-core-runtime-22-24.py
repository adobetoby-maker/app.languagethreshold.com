#!/usr/bin/env python3
"""Derive an unpublished Japanese/English Core 22–24 lesson bundle from pinned drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
SOURCE = CONTENT / "core-translation-22-24-draft.json"
OUTPUT = CONTENT / "core-runtime-pilot-22-24-ja-en.json"
COURSE_ID = "construction-foreman-ja-en"
MODES = ("see", "recall", "hear", "type", "say", "write")

LESSON_DETAILS = {
    22: {
        "title": "Clarify an invoice amount",
        "focus": "Distinguish せいきゅうしょ (invoice), りょうしゅうしょ (receipt), まえばらいきん (deposit) and のこりきんがく (balance). A recorded payment does not by itself establish a change to agreed terms.",
        "speaking": "Explain only invoice details you can verify, ask which line item an unclear amount belongs to, and identify the billing contact for a due-date question.",
        "openingLine": "この きんがく は、どの めいさい こうもく の せつめい に たいおう して いますか。",
        "partnerRole": "A billing contact who checks the invoice and receipt records and clarifies an amount without inventing payment terms.",
        "checkAnswers": ("まえばらいきん", "ふりこみ", "せいきゅう たんとうしゃ"),
    },
    23: {
        "title": "Explain a weather-related schedule proposal",
        "focus": "Use ていあんの ひにち for a proposed date and かくてい for a confirmed one. Report the forecast and site condition as separate facts before promising a schedule.",
        "speaking": "Explain the weather-related delay, distinguish a proposed new date from a confirmed date, and ask the crew to acknowledge the update.",
        "openingLine": "てんき よほうが かわりました。あたらしい ひにちは ていあんです。",
        "partnerRole": "A crew contact who acknowledges the proposal, checks the site condition and asks when the next confirmed update will come.",
        "checkAnswers": ("てんき よほう", "だいたい あん", "れんらく"),
    },
    24: {
        "title": "Record a quality observation",
        "focus": "Use しょけん for an observation, さんしょう しりょう for the current reference, and きょようはんい for tolerance. Ask for a documented review rather than prescribing an unverified correction.",
        "speaking": "Describe the observed surface or joint issue, cite the applicable reference, record evidence, and agree who will review an unconfirmed tolerance or correction.",
        "openingLine": "しょけんを せいかくに せつめい して ください。どの さんしょう しりょうを みれば いいですか。",
        "partnerRole": "A responsible quality contact who records the observation and schedules review against the current specification without assuming a fix.",
        "checkAnswers": ("ひょうめん", "きょようはんい", "レビュー"),
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
    assert [lesson["n"] for lesson in draft["lessons"]] == [22, 23, 24]
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
    print(f"Built private {COURSE_ID} Core 22–24: {len(bundle['cards'])} cards")
