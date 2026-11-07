#!/usr/bin/env python3
"""Derive an unpublished Japanese/English Core 19–21 lesson bundle from pinned drafts."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
SOURCE = CONTENT / "core-translation-19-21-draft.json"
OUTPUT = CONTENT / "core-runtime-pilot-19-21-ja-en.json"
COURSE_ID = "construction-foreman-ja-en"
MODES = ("see", "recall", "hear", "type", "say", "write")

LESSON_DETAILS = {
    19: {
        "title": "Request emergency help clearly",
        "focus": "Use ばしょ and じゅうしょ to give a location and address, and repeat a dispatcher's しじ to confirm understanding. This exercise uses fictional information and makes no actual emergency call.",
        "speaking": "In a simulated emergency, give the known site address and access, report observed facts about an injured person, and repeat the dispatcher's instructions without inventing treatment advice.",
        "openingLine": "きんきゅう の たすけ が ひつよう です。ばしょ を かくにん します。",
        "partnerRole": "A simulated dispatcher who asks for the location and known observations and gives only communication prompts, not medical-treatment instructions.",
        "checkAnswers": ("きんきゅう れんらく たんとうしゃ", "つうしん しれいいん", "しじ"),
    },
    20: {
        "title": "Separate closeout from verification",
        "focus": "Use パンチ リスト for a closeout item list and distinguish かんりょう (work done) from けんしょう (verified). A reported correction is not necessarily approved.",
        "speaking": "Summarize two closeout items with their room, photo, responsible person and deadline, then ask who will verify each correction.",
        "openingLine": "パンチ リストに へやが しめされて います。じょうきょうは まだ けんしょう まち です。",
        "partnerRole": "A closeout contact who checks item records and distinguishes reported completion from final verification.",
        "checkAnswers": ("パンチ リスト", "しめきり", "けんしょう"),
    },
    21: {
        "title": "Guide a client walkthrough",
        "focus": "Use かんりょう した さぎょう for completed work and みかんりょう の こうもく for a pending item. Refer to the ほしょう しょるい instead of promising unverified warranty terms.",
        "speaking": "Show completed and pending work during a walkthrough, invite the client's questions, consult the warranty document, and confirm the follow-up contact.",
        "openingLine": "げんば あんない へ ようこそ。こちら が かんりょう した さぎょう です。",
        "partnerRole": "A client who asks about the finish, pending work and warranty document and repeats the agreed follow-up owner.",
        "checkAnswers": ("クライアント", "みかんりょう の こうもく", "フォローアップ"),
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
    assert [lesson["n"] for lesson in draft["lessons"]] == [19, 20, 21]
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
    print(f"Built private {COURSE_ID} Core 19–21: {len(bundle['cards'])} cards")
