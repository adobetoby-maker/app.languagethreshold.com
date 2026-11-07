#!/usr/bin/env python3
"""Derive an unpublished Japanese/English Core 13–15 lesson bundle from pinned drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
SOURCE = CONTENT / "core-translation-13-15-draft.json"
OUTPUT = CONTENT / "core-runtime-pilot-13-15-ja-en.json"
COURSE_ID = "construction-foreman-ja-en"
MODES = ("see", "recall", "hear", "type", "say", "write")

LESSON_DETAILS = {
    13: {
        "title": "Confirm the specified drywall finish",
        "focus": "Use しようしょ for the specification and しあげ for finish. Compare the サンプル with the drawing and ask for ちょうさ when they appear inconsistent; do not invent a technical solution.",
        "speaking": "Describe the finish called for by the specification, compare a texture sample, and identify which joint or drawing detail needs confirmation before work continues.",
        "openingLine": "しようしょでは どの しあげに なって いますか。テクスチャーを サンプルと くらべて ください。",
        "partnerRole": "A coworker comparing the finish specification and sample who records an unresolved difference for the responsible reviewer.",
        "checkAnswers": ("せっこう ボード", "サンプル", "ちょうさ"),
    },
    14: {
        "title": "Discuss an observed mismatch",
        "focus": "Use ちがい for a visible difference, きじゅん for a reference, and だれが to ask who will confirm a correction. Keep observation distinct from an agreed fix.",
        "speaking": "Describe a difference from the reference respectfully, show the result and example, then agree who will review the correction and record follow-up.",
        "openingLine": "けっかを みせて くれて、ありがとう ございます。きじゅんと ちがう ところが みえます。",
        "partnerRole": "A coworker who listens to the observation, checks the reference with the learner, and identifies who will review the discrepancy.",
        "checkAnswers": ("けっか", "きじゅん", "ごうい"),
    },
    15: {
        "title": "First-day orientation details",
        "focus": "Use どの しょくしゅで for trade experience, いつ for availability, and ～ましょう for a shared confirmation. Distinguish an orientation conversation from a formal hiring decision.",
        "speaking": "Ask a new worker about trade experience and availability, confirm a proposed start date and where orientation will happen, and leave formal hiring steps to the authorized process.",
        "openingLine": "どの しょくしゅで けいけんが ありますか。オリエンテーションは げんばかんとくと いっしょです。",
        "partnerRole": "A new worker who shares relevant experience and availability, asks about orientation, and confirms where to meet the supervisor.",
        "checkAnswers": ("げんばかんとく", "かいしび", "オリエンテーション"),
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
    assert [lesson["n"] for lesson in draft["lessons"]] == [13, 14, 15]
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
    print(f"Built private {COURSE_ID} Core 13–15: {len(bundle['cards'])} cards")
