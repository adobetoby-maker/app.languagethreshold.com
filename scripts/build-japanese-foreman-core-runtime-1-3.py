#!/usr/bin/env python3
"""Derive an unpublished Japanese/English Core 1–3 lesson bundle from pinned drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
SOURCE = CONTENT / "core-translation-draft.json"
OUTPUT = CONTENT / "core-runtime-pilot-1-3-ja-en.json"
COURSE_ID = "construction-foreman-ja-en"
MODES = ("see", "recall", "hear", "type", "say", "write")

LESSON_DETAILS = {
    1: {
        "title": "Morning crew check-in",
        "focus": "Use 職長 for the crew foreman, not 現場監督 for the site supervisor. Ask a name with おなまえは なんですか and make polite requests with ～てください.",
        "speaking": "Greet the crew, ask a worker's name and role, then confirm the worker's shift. The English source objective says role, while its final instruction asks about a shift; practice both without treating them as identical.",
        "openingLine": "さぎょうはんの みなさん、おはようございます。おなまえは なんですか。",
        "partnerRole": "A crew member arriving at the morning meeting point who gives a name and role and confirms a shift.",
        "checkAnswers": ("さぎょうはん", "しゅっきんひょう", "シフト"),
    },
    2: {
        "title": "A question at the safety briefing",
        "focus": "Ask location with どこですか and identify the responsible person with どなたですか. Distinguish the safety plan in the dialogue from the site plan named in the English source objective.",
        "speaking": "Raise one concern from the briefing, ask where the safety plan is, and repeat the assembly point. Do not assume a site plan and safety plan are the same document.",
        "openingLine": "しつもんが あります。あんぜん けいかくしょは どこですか。",
        "partnerRole": "A briefing leader who locates the safety plan and identifies the responsible person and evacuation assembly point.",
        "checkAnswers": ("あんぜん ミーティング", "ひなん しゅうごう ばしょ", "ヘルメット"),
    },
    3: {
        "title": "The right tool",
        "focus": "Use ～が ひつようです for a needed tool, どこですか for its location, and ～てください to ask someone to bring it.",
        "speaking": "Ask a helper for a level and tape measure, confirm the tool, and report one missing screw.",
        "openingLine": "すいへいきが ひつようです。メジャーは どこですか。",
        "partnerRole": "A crew helper who searches the tool box and confirms which tool is needed.",
        "checkAnswers": ("どうぐ", "レンチ", "すいへいき"),
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
    assert [lesson["n"] for lesson in draft["lessons"]] == [1, 2, 3]
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
            "grammar": {"focus": details["focus"], "teachingNotesEnglish": source["teachingNotesEnglish"],
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
    print(f"Built private {COURSE_ID} Core 1–3: {len(bundle['cards'])} cards")
