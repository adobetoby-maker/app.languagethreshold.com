#!/usr/bin/env python3
"""Build inert French 101 Master 19 source and decision evidence."""

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
    "sac à dos", None, "une", "un sac à dos", None, "bleu", None,
    "livres", "elle", None, "bibliothèque", None,
    "Avant, j’habitais près de Julia.",
    "Nous étudiions ensemble le lundi.",
    "Elle avait beaucoup de livres.",
    None,
    "Nous avons parlé espagnol pendant une heure.",
    "La visite a été très agréable.",
    "Avant, j’habitais près de l’école.",
    "J’étudiais l’espagnol l’après-midi.",
]
CARD_NOTES = {
    1: "French sac à dos is masculine while source mochila is feminine; map dictionary and saved item context.",
    2: "Spanish la groups feminine article, it and her; French la/l’ needs a noun or object role and can elide.",
    3: "French une aligns only with a feminine noun; source una is feminine.",
    4: "The backpack changes grammatical gender: source una mochila, French un sac à dos.",
    5: "Source en groups in/on/at; French dans, sur, à or au depends on context.",
    6: "French bleu agrees with masculine sac à dos, whereas source mochila azul is feminine.",
    7: "Spanish los is masculine plural article/object; French les is gender-neutral and role-dependent.",
    10: "Source de is of/from; French de, du and de la depend on following phrase.",
    12: "Source cerca covers near/nearby; French près de versus tout près depends on construction.",
    13: "Spanish imperfect vivía and French imparfait habitais align conditionally; Master-stage progression still needs curriculum review.",
    14: "Spanish plural los lunes signals habitual Mondays; French le lundi is habitual singular construction.",
    16: "The source says went to her house; French suis allé(e) requires speaker gender, while chez elle can hide the physical house sense. No single face is selected.",
    17: "Spanish hablamos can be present or preterite by form; source English pins past spoke. French passé composé is conditional.",
    18: "Spanish fue treats the visit as completed event; French a été versus était changes event/background framing.",
    20: "Source por la tarde is in the afternoon as a past habit; French l’après-midi is contextual.",
}
READER_FRENCH = CARD_FRENCH[12:] + [
    "Ana allait à pied à la bibliothèque.",
    "Nous mangions ensemble le vendredi.",
    "Luis avait un sac à dos bleu.",
    "Maintenant, nous habitons dans une autre ville.",
]
READER_NOTES = {
    1: "Spanish imperfect habit versus French imparfait; the previous residence is near Julia.",
    2: "Spanish los lunes is recurring Mondays; French le lundi is a recurring-day construction.",
    4: "Speaker gender and physical house versus chez elle need a qualified decision; proposed answer remains null.",
    5: "Source English fixes hablamos as spoke; French completed-past construction is conditional.",
    6: "French a été versus était changes completed-event/background nuance.",
    8: "Source Spanish-study scene remains; French proposal teaches study of Spanish only as source evidence.",
    9: "Ana used to walk to the library; allait à pied is habitual movement rather than a single completed trip.",
    10: "Spanish los viernes is recurring Fridays; French le vendredi is habitual usage.",
    11: "Backpack is masculine in French and adjective bleu agrees with sac à dos.",
    12: "Now marks present contrast; French maintenant/nous habitons retains another city.",
}


def make_packet():
    source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 19)
    reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["19"]["reading"]
    archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 19)
    assert len(source["words"]) == len(CARD_FRENCH) == 20
    assert len(reading["target"]) == len(reading["native"]) == len(READER_FRENCH) == 12
    cards = [{
        "id": f"master-french-basics:19:card:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "proposedFrench": CARD_FRENCH[i - 1], "selectedFrench": None,
        "decisionRequired": i in CARD_NOTES or CARD_FRENCH[i - 1] is None,
        "decisionNote": CARD_NOTES.get(i),
    } for i, word in enumerate(source["words"], 1)]
    reader = [{
        "id": f"master-french-basics:19:reader:{i}",
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
        "schema": "french101-master19-source-decision-v1",
        "pairKey": "French:English", "courseId": "french-basics",
        "moduleId": "master-french-basics", "stage": "master", "n": 19,
        "stableLessonId": "master-french-basics:19",
        "stablePairId": "master-french-basics:19:fr-en",
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
            {"sourceRefs": [reader[i - 1]["id"] for i in (1, 7, 12)], "focus": "past habit versus yesterday event and speaker-gender choice", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (2, 5, 11)], "focus": "habitual-day expression, books and event versus background", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (3, 4, 6, 9)], "focus": "library walking, recurring Fridays and city location", "readyForLearner": False},
        ],
        "conditionalSpeakingEvidence": {
            "sourceScene": reading["title"],
            "focus": "Tell a classmate what you habitually did near Julia and what happened on yesterday’s visit; contrast the now-city, then ask about a recurring habit.",
            "sourceRefs": [reader[i - 1]["id"] for i in (1, 2, 3, 4, 5, 6, 7, 8, 12)],
            "readyForLearner": False,
        },
        "archivedRedesign": {
            "title": archived["title"], "scene": archived.get("scene"),
            "separateFromCurrentSource": True,
            "reason": "The archived storm-and-bicycle scene differs from the source Julia residence, Monday study and yesterday visit; it cannot inherit this lesson’s saved positions or recordings.",
        },
        "sourceDecisions": [
            "The source objective teaches Spanish imperfect for past habits/background and contrasts a completed yesterday event; French imparfait versus passé composé is conditional and needs qualified curriculum review at Master stage.",
            "Source una mochila is feminine but French un sac à dos is masculine. Keep noun, article and adjective agreement explicit in selected teaching, dictionary and saved items.",
            "Source la, los, en, de and cerca group context-sensitive article, object and preposition senses; do not score one context-free French face.",
            "Ayer fui a su casa leaves narrator gender unspecified and describes her house. Choose a natural French form without silently assigning gender or dropping the house meaning.",
            "The past-event value of hablamos and fue, recurring Mondays/Fridays, Spanish-study scene and now-city contrast need exact source and register review.",
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
        print("PASS French 101 Master 19 packet build --check")
    else:
        target.write_text(content)
