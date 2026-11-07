#!/usr/bin/env python3
"""Derive an unpublished Japanese/English Core 16–18 lesson bundle from pinned drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
SOURCE = CONTENT / "core-translation-16-18-draft.json"
OUTPUT = CONTENT / "core-runtime-pilot-16-18-ja-en.json"
COURSE_ID = "construction-foreman-ja-en"
MODES = ("see", "recall", "hear", "type", "say", "write")

LESSON_DETAILS = {
    16: {
        "title": "Coordinate the work handoff",
        "focus": "Use いぞん かんけい for a task dependency and さぎょう ひきつぎ for a work handoff. Ask どなたですか for the designated contact and distinguish decided details from open questions.",
        "speaking": "Explain how one crew depends on another, ask who the subcontractor contact is, and confirm the revised handoff and access in a written update.",
        "openingLine": "さぎょう ひきつぎを ちょうせい する ひつようが あります。きょうりょく ぎょうしゃの れんらく たんとうしゃは どなたですか。",
        "partnerRole": "A subcontractor contact who checks availability and access and records confirmed versus pending handoff details.",
        "checkAnswers": ("きょうりょく ぎょうしゃ", "さぎょう ひきつぎ", "かくにん"),
    },
    17: {
        "title": "Follow up on a delivery shortage",
        "focus": "Distinguish ちゅうもん (order), じゅりょうしょ (receipt) and のうひん (delivery). Read back the address and quantity before agreeing on a revised date.",
        "speaking": "Report the shortage, read back the order address and quantity with the supplier, and identify who will confirm unloading and the follow-up delivery date.",
        "openingLine": "のうひんは ちゅうもんと ちがって います。じゅりょうしょに ふそくが かいて あります。",
        "partnerRole": "A supplier representative who verifies the order and receipt, acknowledges the shortage, and confirms the designated follow-up contact.",
        "checkAnswers": ("ふそく", "すうりょう", "におろし"),
    },
    18: {
        "title": "Prepare for an inspection",
        "focus": "Use みかんりょう こうもく for a pending checklist item and しょうにん for actual approval. Do not describe an unconfirmed approval as granted.",
        "speaking": "Summarize the required documents and observations, identify pending checks separately from approvals, and confirm who will respond to the inspector.",
        "openingLine": "チェックリストに みかんりょう こうもくが あります。しょうにんの かくにんは とれて いません。",
        "partnerRole": "The designated inspection contact who checks the permit and documents, records pending items and coordinates a response without claiming approval prematurely.",
        "checkAnswers": ("きょかしょ", "しょうにん", "けんさかん"),
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
    assert [lesson["n"] for lesson in draft["lessons"]] == [16, 17, 18]
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
    print(f"Built private {COURSE_ID} Core 16–18: {len(bundle['cards'])} cards")
