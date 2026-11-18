#!/usr/bin/env python3
"""Build inert French 101 Master 20 source and decision evidence."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
MASTER = ROOT / "src/data/core60/es/master-spanish-basics.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-19-20-redesign-draft.json"
SOURCES = (MASTER, PRACTICE, ARCHIVE)

# Review candidates only. No French answer is selected for teaching, scoring or audio.
CARD_FRENCH = [
    None, "je suis", "livre", None, None, "un", "une", None,
    "et", None, "deux", "livres",
    None,
    "Hier, j’ai étudié avec mes amis.",
    "Aujourd’hui, nous préparons un examen.",
    "Je veux aller à la bibliothèque, mais elle est fermée.",
    "Nous pouvons étudier à la maison parce que nous avons les livres.",
    "Demain, nous allons nous exercer encore une fois.",
    "Je veux étudier, mais la bibliothèque est fermée.",
    "Ana a un livre et deux cahiers.",
]
CARD_NOTES = {
    1: "Source estudiante has no gender marker; French étudiant/étudiante does. A context-free scored face needs a qualified choice.",
    2: "Spanish soy states identity; French je suis can also express condition and location, so retain the identity explanation.",
    4: "Spanish está groups condition/location; French est does not preserve that source distinction by itself.",
    5: "Spanish la groups feminine article, it and her; French la/l’ differs by grammatical role and elision.",
    6: "Source un specifies a masculine article; French un aligns in a masculine-noun context only.",
    7: "Source una specifies a feminine article; French une aligns in a feminine-noun context only.",
    8: "Source en groups in/on/at; French à, dans, sur and other forms depend on the phrase.",
    10: "Spanish los is masculine plural article or object; French les is gender-neutral and role-dependent.",
    13: "The source student is gender-neutral; French étudiant/étudiante requires a gender or a contextual rewrite. Keep the school, not the archived workshop.",
    14: "Spanish completed past studied is proposed with French passé composé; confirm tense progression and saved-item identity.",
    15: "Spanish estamos preparando marks ongoing action; French present can express it, while en train de is an explicit progressive alternative.",
    16: "The second clause's Spanish está refers to the library; French elle est fermée keeps that antecedent.",
    17: "Source los libros retains masculine plural; French les livres is gender-neutral but contextual noun is masculine.",
    18: "Spanish vamos a practicar is a going-to plan. French allons nous exercer uses a different lexical choice; qualify practice sense.",
    20: "Source dos cuadernos is two notebooks, not one; French deux cahiers preserves the number.",
}
READER_FRENCH = CARD_FRENCH[12:] + [
    "Nous allons au café parce qu’il est ouvert.",
    None,
    "Nous étudions pendant une heure, puis nous rentrons à pied.",
    "Demain, nous allons réviser ensemble.",
]
READER_NOTES = {
    1: "Source student is unspecified gender. French étudiant/étudiante or a contextual rewrite needs qualified choice.",
    2: "Source ayer estudié is completed past; French passé composé proposal needs curriculum progression review.",
    3: "Spanish estamos preparando marks an ongoing exam-preparation action; French present or en train de needs qualification.",
    4: "French elle refers to the library, retaining the source closed-library antecedent.",
    5: "Spanish los is masculine plural, whereas French les is gender-neutral; contextual les livres retains books.",
    6: "French allons nous exercer is a conditional equivalent for going to practice again.",
    9: "Café is the same place; French il est ouvert retains the café antecedent.",
    10: "Source English treats him means Ana pays for Luis after the café plan. Ana l’invite alone can mean invites him without payment; select an explicit payment wording only after qualified source/French review.",
    11: "Rentrons à pied implies returning home. Qualify against source walk home and preserve one-hour sequence.",
    12: "Repasser/revoir/réviser have different review senses; réviser ensemble is conditional for study review.",
}


def make_packet():
    source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 20)
    reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["20"]["reading"]
    archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 20)
    assert len(source["words"]) == len(CARD_FRENCH) == 20
    assert len(reading["target"]) == len(reading["native"]) == len(READER_FRENCH) == 12
    cards = [{
        "id": f"master-french-basics:20:card:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "proposedFrench": CARD_FRENCH[i - 1], "selectedFrench": None,
        "decisionRequired": i in CARD_NOTES or CARD_FRENCH[i - 1] is None,
        "decisionNote": CARD_NOTES.get(i),
    } for i, word in enumerate(source["words"], 1)]
    reader = [{
        "id": f"master-french-basics:20:reader:{i}",
        "sourceSpanish": es, "sourceEnglish": en,
        "proposedFrench": READER_FRENCH[i - 1], "selectedFrench": None,
        "decisionNote": READER_NOTES.get(i),
    } for i, (es, en) in enumerate(zip(reading["target"], reading["native"]), 1)]
    mode_refs = {"See": 1, "Recall": 3, "Hear": 5, "Type": 7, "Say": 9, "Write": 12}
    modes = [{
        "mode": mode, "sourceRef": reader[n - 1]["id"],
        "sourceEnglish": reader[n - 1]["sourceEnglish"],
        "conditionalFrench": reader[n - 1]["proposedFrench"],
        "readyForLearner": False, "recordedAudio": False,
    } for mode, n in mode_refs.items()]
    return {
        "schema": "french101-master20-source-decision-v1",
        "pairKey": "French:English", "courseId": "french-basics",
        "moduleId": "master-french-basics", "stage": "master", "n": 20,
        "stableLessonId": "master-french-basics:20",
        "stablePairId": "master-french-basics:20:fr-en",
        "sourceFilesSha256": {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest() for path in SOURCES},
        "sourceTitleEnglish": source["title"],
        "sourceObjectiveEnglish": source["objective"],
        "sourceFocusEnglish": source["focus"],
        "sourceSpeakingEnglish": source["speaking"],
        "sourceGrammarEnglish": source["grammar"],
        "sourceReaderTitleSpanish": reading["title"],
        "cards": cards, "reader": reader,
        "conditionalModeEvidence": modes,
        "conditionalFormEvidence": [
            {"sourceRefs": [reader[i - 1]["id"] for i in (1, 4, 5)], "focus": "and, but, because: short clause links with preserved reasons and contrasts", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (2, 3, 6, 12)], "focus": "completed past, ongoing preparation, tomorrow plan and review", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (9, 10, 11)], "focus": "café consequence, explicit payment sense and then sequence", "readyForLearner": False},
        ],
        "conditionalSpeakingEvidence": {
            "sourceScene": reading["title"],
            "focus": "Discuss a changed library study plan with a classmate; connect an idea, contrast the closure, explain the home-study reason, and say what happens next without inventing a new scene.",
            "sourceRefs": [reader[i - 1]["id"] for i in (1, 3, 4, 5, 6, 7, 9, 10, 11, 12)],
            "readyForLearner": False,
        },
        "archivedRedesign": {
            "title": archived["title"], "scene": archived.get("scene"),
            "separateFromCurrentSource": True,
            "reason": "The archived workshop-room negotiation changes the source beginner library, café and home-study conversation, characters and connective objective; it cannot inherit this lesson's saved positions or recordings.",
        },
        "sourceDecisions": [
            "The current source is a Spanish 101 final conversation at Master stage. It teaches y, pero, porque and entonces, not the archived French workshop negotiation; qualify the capstone's beginner progression before selecting content.",
            "Source estudiante is gender-neutral; French étudiant/étudiante needs context. Spanish soy versus está distinguishes identity and condition/location, while French suis/est alone does not.",
            "Source la, los and en group article/object and locative senses that need contextual French faces and saved-item/dictionary mapping; French les does not preserve the masculine plural marking of los.",
            "Reader 10 treats Luis after he has no money. Ana l’invite can be an invitation without payment; a French answer must communicate the payment/treat meaning and preserve café context.",
            "The source combines yesterday's completed study, today's ongoing exam preparation and tomorrow's plan. Qualify French tense/aspect and the final connective result, including walking home, before six modes or audio selection.",
        ],
        "selectedDecision": None, "normalProjectionAllowed": False,
        "audioScript": None,
        "gates": {key: False for key in (
            "reviewed", "qualifiedFrenchReview", "qualifiedSourceReview", "qualifiedCurriculumReview", "qualifiedDictionaryReview",
            "learnerRegistered", "scoringRegistered", "audioRegistered", "listeningReviewed",
            "offlineRegistered", "progressRegistered", "nativeV4Registered")},
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = json.dumps(make_packet(), ensure_ascii=False, indent=2) + "\n"
    target = HERE / "decision.json"
    if args.check:
        assert target.read_text() == content, "generated decision.json is stale"
        print("PASS French 101 Master 20 packet build --check")
    else:
        target.write_text(content)
