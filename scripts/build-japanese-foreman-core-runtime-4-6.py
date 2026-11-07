#!/usr/bin/env python3
"""Derive an unpublished Japanese/English Core 4–6 lesson bundle from pinned drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
SOURCE = CONTENT / "core-translation-4-6-draft.json"
OUTPUT = CONTENT / "core-runtime-pilot-4-6-ja-en.json"
COURSE_ID = "construction-foreman-ja-en"
MODES = ("see", "recall", "hear", "type", "say", "write")

LESSON_DETAILS = {
    4: {
        "title": "Confirm the material order",
        "focus": "Distinguish ちゅうもん (the order), のうひん (delivery), and のうにゅうぎょうしゃ (supplier). Ask quantity with どのくらい and timing with いつ.",
        "speaking": "Request one material and confirm the order's quantity, unit, measurement, and expected delivery with the supplier. Read the actual order before acting.",
        "openingLine": "この ざいりょうが ひつよう です。ちゅうもんの すうりょうは どのくらい ですか。",
        "partnerRole": "A supplier representative who can read back the material order and confirm delivery details without guessing a quantity or unit.",
        "checkAnswers": ("のうにゅうぎょうしゃ", "すうりょう", "のうひん"),
    },
    5: {
        "title": "Find the current plan detail",
        "focus": "Use ずめん for the drawing or plan and すんぽう for a dimension. Check さいしんばん before relying on a revision; かいてあります describes information shown on the plan.",
        "speaking": "Point out the wall and door on a drawing, ask whether the revision is current, and confirm which dimension applies at the reference point.",
        "openingLine": "これは さいしんばん ですか。ずめんの すんぽうを かくにん して ください。",
        "partnerRole": "A coworker holding the plan who can locate a detail and check its revision and dimension against the document.",
        "checkAnswers": ("ずめん", "きじゅんてん", "すんぽう"),
    },
    6: {
        "title": "Repeat the framing instruction",
        "focus": "Use もういちど いってください to request repetition, ～の ことですか to confirm a referenced part, and まえに for 'before'. Distinguish beam はり from joist ねだ.",
        "speaking": "Ask a coworker to repeat a framing instruction, identify the beam or joist on the drawing, and confirm the specified sequence before continuing.",
        "openingLine": "しじを もういちど いって ください。この はりの ことですか。",
        "partnerRole": "A framing lead who repeats the instruction, points to the plan mark, and confirms which part and sequence are intended.",
        "checkAnswers": ("たてわく", "まぐさ", "てじゅん"),
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
    assert [lesson["n"] for lesson in draft["lessons"]] == [4, 5, 6]
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
    print(f"Built private {COURSE_ID} Core 4–6: {len(bundle['cards'])} cards")
