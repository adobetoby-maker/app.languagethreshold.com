#!/usr/bin/env python3
"""Derive an unpublished Japanese/English Core 25–27 lesson bundle from pinned drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
SOURCE = CONTENT / "core-translation-25-27-draft.json"
OUTPUT = CONTENT / "core-runtime-pilot-25-27-ja-en.json"
COURSE_ID = "construction-foreman-ja-en"
MODES = ("see", "recall", "hear", "type", "say", "write")

LESSON_DETAILS = {
    25: {
        "title": "Explain a supervised practice task",
        "focus": "Use まず to mark the first step and じぶん の ことば で to request a teach-back. Distinguish かんとく の もと で supervised practice from independent authorization.",
        "speaking": "Explain a demonstrated task, invite a trainee's question, then ask them to repeat the understood sequence in their own words before supervised practice.",
        "openingLine": "まず デモンストレーション を みましょう。じぶん の ことば で てじゅん を せつめい して ください。",
        "partnerRole": "A trainee who asks for repetition, explains the sequence back and practices only under the assigned supervisor.",
        "checkAnswers": ("デモンストレーション", "ぎもん", "しょくちょう"),
    },
    26: {
        "title": "Listen to a team concern",
        "focus": "Use きがかり for a concern, そんちょう for respect, and てきせつな れんらく たんとうしゃ for the appropriate contact. Do not promise confidentiality that has not been confirmed.",
        "speaking": "Explain team expectations, invite a worker's concern without assuming the facts, and confirm the appropriate contact and follow-up path.",
        "openingLine": "この チームでは、おたがいの はなしを ききあいます。きがかりを つたえて くれて、ありがとうございます。",
        "partnerRole": "A worker who shares a concern and asks how it will be passed to the appropriate contact without being promised unverified secrecy.",
        "checkAnswers": ("そんちょう", "サポート", "れんらく たんとうしゃ"),
    },
    27: {
        "title": "Close the day with clear status",
        "focus": "Use みかんりょうの こうもく for a pending item and distinguish reported progress from confirmed completion. Ask for チェックイン and identify open questions for tomorrow.",
        "speaking": "Summarize completed and pending work, confirm every crew member checked in, and state tomorrow's plan and unresolved questions without assuming who has a missing tool.",
        "openingLine": "きょうの しんちょくを ふりかえりましょう。ぜんいんが チェックイン した ことを かくにんして ください。",
        "partnerRole": "A crew contact who checks attendance, reports assigned cleanup and inventory status, and repeats what needs communication before the next shift.",
        "checkAnswers": ("しんちょく", "ざいこ", "かくにん"),
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
    assert [lesson["n"] for lesson in draft["lessons"]] == [25, 26, 27]
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
    print(f"Built private {COURSE_ID} Core 25–27: {len(bundle['cards'])} cards")
