#!/usr/bin/env python3
"""Derive an unpublished Japanese/English Core 7–9 lesson bundle from pinned drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
SOURCE = CONTENT / "core-translation-7-9-draft.json"
OUTPUT = CONTENT / "core-runtime-pilot-7-9-ja-en.json"
COURSE_ID = "construction-foreman-ja-en"
MODES = ("see", "recall", "hear", "type", "say", "write")

LESSON_DETAILS = {
    7: {
        "title": "Find the approved roof instructions",
        "focus": "Use していされています for a specified material and どこですか to ask where an access point is. のぼりぐち means a physical way up; verify actual site access and the manufacturer's instructions.",
        "speaking": "Identify a roof material on the plan and ask where its manufacturer's approved installation instructions and authorized access point are. Do not infer authorization from a vocabulary answer.",
        "openingLine": "どの ざいりょうが していされて いますか。メーカーの マニュアルが ひつようです。",
        "partnerRole": "A site colleague who locates the approved roof material and manufacturer manual and directs the learner to verify authorized access.",
        "checkAnswers": ("やね", "OSBパネル", "マニュアル"),
    },
    8: {
        "title": "Check the concrete delivery",
        "focus": "Distinguish はいごう (mix design) from the delivered コンクリート. Use まだ おわっていません for a pending inspection and だれが for the person confirming a mix.",
        "speaking": "Ask what concrete delivery and foundation checks are confirmed and which inspection or authorization remains pending. Refer to the documented mix design, not a guessed specification.",
        "openingLine": "コンクリートの のうにゅうは かくにんされて いますか。けんさは まだ おわって いません。",
        "partnerRole": "A responsible site contact who can check the delivery paperwork, report pending inspection status, and identify who may confirm the mix design.",
        "checkAnswers": ("かたわく", "はいごう", "けんさ"),
    },
    9: {
        "title": "Record a reported problem",
        "focus": "Use どこで for where an event happened and なんじに for when it was noticed. Separate じっさいに みた こと (observed facts) from items still requiring ちょうさ (review).",
        "speaking": "Acknowledge a reported problem, ask where and when it was noticed, and record the account without assigning a cause or blame before review.",
        "openingLine": "しらせて くれて ありがとうございます。どこで おきましたか。",
        "partnerRole": "A crew member who reports an observed problem and helps distinguish direct observations from unverified explanations.",
        "checkAnswers": ("もんだい", "ばしょ", "ちょうさ"),
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
    assert [lesson["n"] for lesson in draft["lessons"]] == [7, 8, 9]
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
    print(f"Built private {COURSE_ID} Core 7–9: {len(bundle['cards'])} cards")
