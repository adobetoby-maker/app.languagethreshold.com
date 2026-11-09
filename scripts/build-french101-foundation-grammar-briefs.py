#!/usr/bin/env python3
"""Build private French 101 Foundation grammar briefs from exact Reader turns."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("content/french-basics/private-runtime-foundation-1-10.json")
OUTPUT = Path("content/french-basics/private-foundation-grammar-briefs-fr-en.json")

# Authored teaching notes. Reader examples are copied only from the pinned source.
BRIEFS = [
    ("Names and polite address",
     "Je m’appelle introduces your name. Comment vous appelez-vous ? asks an adult for a name with vous.",
     "Claire writes enchantée and Marc writes enchanté; the final -e changes the written form, not its pronunciation.",
     [1, 2, 4, 5]),
    ("Introducing and identifying one object",
     "Use un with a masculine noun and une with a feminine noun when introducing one object. Learn the article with the noun.",
     "C’est un cahier introduces a notebook; voilà la gomme points to the specific eraser already in the conversation.",
     [2, 3, 6]),
    ("One object and several objects",
     "Des introduces unspecified plural objects; les identifies particular plural objects. The article often carries the audible number contrast.",
     "Les crayons means the pencils in view; des stylos means pens without identifying a particular set. Plural -s is written but usually silent.",
     [1, 2, 3]),
    ("People and the forms of être",
     "Match the subject to être: je suis, tu es, il or elle est, nous sommes, vous êtes, ils or elles sont.",
     "Je suis identifies Nadia; nous sommes includes Hugo and Nadia. Tu addresses the classmate in this exchange.",
     [1, 2, 3, 7]),
    ("Role, origin, and agreement",
     "A plain role follows être without an article: je suis étudiant or je suis étudiante. Je viens changes its country preposition with the country name.",
     "Je viens d’Espagne uses d’ before Espagne; je viens de France uses de. Elle est française and elle est gentille match the woman described.",
     [2, 3, 4, 5]),
    ("Location and a matching adjective",
     "Use être to locate an object or describe a state here. Sur means on, dans means in, and près du means near the.",
     "Il refers back to le livre; elle refers back to la trousse. Marc is fatigué; Claire is prête, with the adjective matching the person.",
     [2, 4, 5, 6, 8, 9]),
    ("Existence versus location",
     "Il y a says that something exists and stays the same with one or several things. Être locates a particular thing.",
     "Il y a une bibliothèque asks whether a library exists; elle est là gives its location. Negated existence uses il n’y a pas d’ before ordinateur.",
     [1, 2, 3, 7, 8]),
    ("Age, quantities, and need",
     "French states age with avoir: j’ai dix-huit ans. Use il y a for a count and avoir besoin de for what a group needs.",
     "Tu as quel âge ? asks for age; nous avons besoin de dix livres states a need for ten books.",
     [1, 2, 4, 5]),
    ("Questions and full negation",
     "A yes-or-no question can use rising intonation or est-ce que. In this course, write ne before the verb and pas after it.",
     "Elle n’est pas contracts ne before a vowel. After negated avoir, un livre becomes pas de livre; the role in je suis étudiant has no article.",
     [1, 2, 3, 4, 5, 6]),
    ("Ask for repetition and review",
     "Je ne comprends pas says that you do not understand. Tu peux répéter, s’il te plaît ? asks a classmate to repeat; plus lentement asks for a slower pace.",
     "Je suis une nouvelle étudiante includes une because nouvelle modifies the role noun. Je ne comprends pas keeps the full written negation.",
     [1, 4, 6]),
]


def build():
    raw = (ROOT / SOURCE).read_bytes()
    fixture = json.loads(raw)
    if fixture.get("registered") is not False or fixture.get("reviewed") is not False:
        raise ValueError("Foundation source must remain private and unreviewed")
    stage = fixture["stageFile"]["lessons"]
    support = fixture["support"]
    if not len(stage) == len(support) == len(BRIEFS):
        raise ValueError("Foundation lesson count changed")
    lessons = []
    for n, (base, overlay, brief) in enumerate(zip(stage, support, BRIEFS, strict=True), 1):
        title, explanation, contrast, turns = brief
        if base["n"] != n or overlay["n"] != n or overlay["stableLessonKey"] != f"foundation-french-basics:{n}":
            raise ValueError(f"Foundation lesson {n} identity changed")
        if len(set(turns)) != len(turns) or len(turns) < 2:
            raise ValueError(f"Foundation lesson {n} needs distinct source examples")
        reader = overlay["reader"]["sentences"]
        examples = []
        for turn in turns:
            if not 1 <= turn <= len(reader):
                raise ValueError(f"Foundation lesson {n} Reader turn changed")
            line = reader[turn - 1]
            if not line["target"].strip() or not line["native"].strip():
                raise ValueError(f"Foundation lesson {n} Reader pair missing")
            examples.append({"readerTurn": turn, "target": line["target"], "native": line["native"]})
        lessons.append({
            "n": n,
            "stableLessonKey": overlay["stableLessonKey"],
            "sourceObjective": base["objective"],
            "grammarPoint": title,
            "explanation": explanation,
            "contrast": contrast,
            "examples": examples,
            "reviewed": False,
        })
    return {
        "schema": 1,
        "pairKey": "French:English",
        "moduleId": "foundation-french-basics",
        "sourceFixturePath": str(SOURCE),
        "sourceFixtureSha256": hashlib.sha256(raw).hexdigest(),
        "registered": False,
        "reviewed": False,
        "lessons": lessons,
    }


if __name__ == "__main__":
    text = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    destination = ROOT / OUTPUT
    if "--check" in sys.argv:
        if not destination.is_file() or destination.read_text() != text:
            raise SystemExit("French 101 Foundation grammar briefs need regeneration")
    else:
        destination.write_text(text)
    print("French 101 Foundation: 10 private source-linked grammar briefs")
