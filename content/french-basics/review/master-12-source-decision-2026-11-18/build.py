#!/usr/bin/env python3
"""Build inert French 101 Master 12 review evidence from current source rows."""

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
MASTER = ROOT / "src/data/core60/es/master-spanish-basics.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-10-12-redesign-draft.json"
SOURCES = (MASTER, PRACTICE, ARCHIVE)

# These are conditional author candidates. No row is selected for teaching or recording.
CARD_FRENCH = [
    "table", "le", "la", "une", "une table", "ici", None, "les", "pour",
    "trois", "de", None,
    "Je veux aller au musée.",
    "Julia peut venir le matin.",
    "Diego ne peut pas sortir avant dix heures.",
    "Nous pouvons manger après la visite.",
    "Nous voulons marcher à travers le parc.",
    "Peux-tu réserver une table pour trois ?",
    "Je peux étudier ici aujourd’hui.",
    "Peux-tu ouvrir la fenêtre ?",
]
CARD_NOTES = {
    2: "Spanish el marks masculine singular; French le also elides before a vowel. Contextual article forms need review.",
    3: "Spanish la groups definite article and feminine object pronouns; French la needs role and elision context.",
    7: "Source en groups in/on/at. One isolated French answer would erase place and time contrasts.",
    8: "Spanish las is feminine plural article/object; French les is gender-neutral and can be article or object pronoun.",
    9: "Source para groups for and purpose. French pour needs object versus infinitive context.",
    11: "Source de groups of/from; French de requires phrase-level sense and contraction decisions.",
    12: "Source no groups no and not. French non versus ne…pas depends on the utterance.",
    17: "Spanish caminar por el parque means walking through the park; à travers preserves the directional reading, subject to idiom review.",
    18: "Source puedes is informal singular; French tu is proposed, but role/register review remains.",
    20: "Source puedes is informal singular; French tu is proposed, but role/register review remains.",
}
READER_FRENCH = [
    "Je veux aller au musée.",
    "Julia peut venir le matin.",
    "Diego ne peut pas sortir avant dix heures.",
    "Nous pouvons manger après la visite.",
    "Nous voulons marcher à travers le parc.",
    "Peux-tu réserver une table pour trois ?",
    "Je peux étudier ici aujourd’hui.",
    "Peux-tu ouvrir la fenêtre ?",
    "Ana peut aider pour les devoirs.",
    "Nous pouvons parler à voix basse.",
    "Ils ne peuvent pas manger dans cette salle.",
    "Pouvez-vous répéter la question, s’il vous plaît ?",
]
READER_NOTES = {
    5: "Preserve through the park; review à travers versus dans for the scene.",
    6: "Spanish puedes is informal singular; proposed tu needs the speaking relationship confirmed.",
    8: "Spanish puedes is informal singular; proposed tu needs the speaking relationship confirmed.",
    9: "French aider pour les devoirs is a conditional idiom choice for help with homework.",
    11: "Spanish pueden does not identify gender; French ils introduces a gender default requiring a source/context decision.",
    12: "Spanish puede can be polite usted or third person; polite vous is inferred from please and needs review.",
}


def make_packet():
    source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 12)
    reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["12"]["reading"]
    archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 12)
    assert len(source["words"]) == len(CARD_FRENCH) == 20
    assert len(reading["target"]) == len(reading["native"]) == len(READER_FRENCH) == 12
    cards = [{
        "id": f"master-french-basics:12:card:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "proposedFrench": CARD_FRENCH[i - 1], "selectedFrench": None,
        "decisionRequired": i in CARD_NOTES or CARD_FRENCH[i - 1] is None,
        "decisionNote": CARD_NOTES.get(i),
    } for i, word in enumerate(source["words"], 1)]
    reader = [{
        "id": f"master-french-basics:12:reader:{i}",
        "sourceSpanish": es, "sourceEnglish": en,
        "proposedFrench": READER_FRENCH[i - 1], "selectedFrench": None,
        "decisionNote": READER_NOTES.get(i),
    } for i, (es, en) in enumerate(zip(reading["target"], reading["native"]), 1)]
    mode_refs = {"See": 1, "Recall": 2, "Hear": 3, "Type": 4, "Say": 6, "Write": 11}
    modes = [{
        "mode": mode, "sourceRef": reader[n - 1]["id"],
        "sourceEnglish": reader[n - 1]["sourceEnglish"],
        "conditionalFrench": reader[n - 1]["proposedFrench"],
        "readyForLearner": False, "recordedAudio": False,
    } for mode, n in mode_refs.items()]
    return {
        "schema": "french101-master12-source-decision-v1",
        "pairKey": "French:English", "courseId": "french-basics",
        "moduleId": "master-french-basics", "stage": "master", "n": 12,
        "stableLessonId": "master-french-basics:12",
        "stablePairId": "master-french-basics:12:fr-en",
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
            {"sourceRefs": [reader[i - 1]["id"] for i in (2, 3, 4)], "focus": "pouvoir + infinitive; person and negation", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (6, 8, 12)], "focus": "tu versus vous request register", "readyForLearner": False},
        ],
        "conditionalSpeakingEvidence": {
            "sourceScene": reading["title"],
            "focus": "Make a plan everyone can do, including availability and a table for three.",
            "sourceRefs": [reader[i - 1]["id"] for i in (1, 2, 3, 4, 6, 12)],
            "readyForLearner": False,
        },
        "archivedRedesign": {
            "title": archived["title"], "scene": archived.get("scene"),
            "separateFromCurrentSource": True,
            "reason": "The archived group-presentation meeting, room permission and fallback library differ from the source free-Saturday museum/park/table plan.",
        },
        "sourceDecisions": [
            "The pinned Spanish objective teaches poder stem change o→ue except nosotros; French pouvoir has its own irregular paradigm and must be authored as a French objective rather than copied.",
            "The source places a beginner ability-and-planning lesson at Master 12; qualified curriculum review must decide stage placement without changing saved identity silently.",
            "Grouped articles, pronouns, prepositions and no/not require contextual dictionary senses; masculine/feminine information in Spanish may not survive identical French forms.",
            "The source Reader alternates informal puedes, ambiguous puede and unspecified third-person plural pueden; French register and gender choices need review before selection.",
        ],
        "selectedDecision": None, "normalProjectionAllowed": False,
        "audioScript": None,
        "gates": {key: False for key in (
            "reviewed", "qualifiedFrenchReview", "qualifiedSourceReview", "qualifiedDictionaryReview",
            "learnerRegistered", "scoringRegistered", "audioRegistered", "listeningReviewed",
            "offlineRegistered", "progressRegistered", "nativeV4Registered")},
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    text = json.dumps(make_packet(), ensure_ascii=False, indent=2) + "\n"
    target = HERE / "decision.json"
    if args.check:
        assert target.read_text() == text, "generated decision.json is stale"
        print("PASS French 101 Master 12 packet build --check")
    else:
        target.write_text(text)
