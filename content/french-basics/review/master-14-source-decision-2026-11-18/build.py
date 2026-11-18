#!/usr/bin/env python3
"""Build inert French 101 Master 14 review evidence from current source rows."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
MASTER = ROOT / "src/data/core60/es/master-spanish-basics.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-13-15-redesign-draft.json"
SOURCES = (MASTER, PRACTICE, ARCHIVE)

# Unselected, conditional candidates. Isolated grouped senses stay null.
CARD_FRENCH = [
    None, None, None, None, "et", None, None, "je", None, "dix", "oui", None,
    "Julia se réveille à six heures.",
    "Elle se lève et ouvre la fenêtre.",
    "Elle se douche avant le petit déjeuner.",
    "Elle se prépare pour le cours.",
    "Le soir, elle se couche tôt.",
    "Je me couche après avoir étudié.",
    "Je me lève à sept heures.",
    "Ana se douche le matin.",
]
CARD_NOTES = {
    1: "Spanish me groups object and reflexive senses. French me/m' needs verb and pronoun role context.",
    2: "Spanish te groups object and reflexive senses. French te/t' also requires register and verb context.",
    3: "Source clase groups class and classroom; French cours/classe/salle de classe are context-specific.",
    4: "Source la groups feminine article and object/person pronouns; French la/l' needs grammatical role and elision context.",
    6: "Spanish las marks feminine plural article/object; French les does not preserve that gender contrast.",
    7: "Source para groups for and purpose; French pour requires an object or infinitive context.",
    9: "Source de groups of and from; French de needs phrase-level sense and contractions.",
    12: "Source por groups through and because of; the nighttime phrase is temporal, not either isolated glossary sense.",
    16: "French cours is a conditional class-session choice; compare source clase with Reader setting.",
    18: "After studying is rendered après avoir étudié; review this infinitive construction at the intended level.",
}
READER_FRENCH = CARD_FRENCH[12:] + [
    "Nous nous préparons pour le cours.",
    "Luis se couche à dix heures.",
    "Tu te réveilles tôt ?",
    "Oui, je me réveille avant sept heures.",
]
READER_NOTES = {
    4: "Course/session sense of class is conditional; do not silently substitute classroom.",
    6: "Après avoir étudié preserves the after-studying relation; requires curriculum/form review.",
    9: "Cours is a conditional class-session choice.",
    11: "Spanish te indicates informal singular; French tu is proposed pending role/register review.",
    12: "French je preserves the first-person reply and reflexive me.",
}


def make_packet():
    source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 14)
    reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["14"]["reading"]
    archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 14)
    assert len(source["words"]) == len(CARD_FRENCH) == 20
    assert len(reading["target"]) == len(reading["native"]) == len(READER_FRENCH) == 12
    cards = [{
        "id": f"master-french-basics:14:card:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "proposedFrench": CARD_FRENCH[i - 1], "selectedFrench": None,
        "decisionRequired": i in CARD_NOTES or CARD_FRENCH[i - 1] is None,
        "decisionNote": CARD_NOTES.get(i),
    } for i, word in enumerate(source["words"], 1)]
    reader = [{
        "id": f"master-french-basics:14:reader:{i}",
        "sourceSpanish": es, "sourceEnglish": en,
        "proposedFrench": READER_FRENCH[i - 1], "selectedFrench": None,
        "decisionNote": READER_NOTES.get(i),
    } for i, (es, en) in enumerate(zip(reading["target"], reading["native"]), 1)]
    mode_refs = {"See": 1, "Recall": 2, "Hear": 3, "Type": 4, "Say": 11, "Write": 12}
    modes = [{
        "mode": mode, "sourceRef": reader[n - 1]["id"],
        "sourceEnglish": reader[n - 1]["sourceEnglish"],
        "conditionalFrench": reader[n - 1]["proposedFrench"],
        "readyForLearner": False, "recordedAudio": False,
    } for mode, n in mode_refs.items()]
    return {
        "schema": "french101-master14-source-decision-v1",
        "pairKey": "French:English", "courseId": "french-basics",
        "moduleId": "master-french-basics", "stage": "master", "n": 14,
        "stableLessonId": "master-french-basics:14",
        "stablePairId": "master-french-basics:14:fr-en",
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
            {"sourceRefs": [reader[i - 1]["id"] for i in (1, 2, 3, 4)], "focus": "se with Julia/elle in routine verbs", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (6, 7, 9, 11, 12)], "focus": "me/nous/te person contrast and register", "readyForLearner": False},
        ],
        "conditionalSpeakingEvidence": {
            "sourceScene": reading["title"],
            "focus": "Tell Julia's morning routine in order and answer an early-waking question.",
            "sourceRefs": [reader[i - 1]["id"] for i in (1, 2, 3, 4, 5, 11, 12)],
            "readyForLearner": False,
        },
        "archivedRedesign": {
            "title": archived["title"], "scene": archived.get("scene"),
            "separateFromCurrentSource": True,
            "reason": "The archived interrupted-projector rehearsal teaches past routine and interruption; the current source is a simple reflexive morning routine.",
        },
        "sourceDecisions": [
            "The pinned Spanish objective teaches me/te/se/nos/se before a conjugated reflexive verb; French me/te/se/nous/se has elision and person-specific morphology, so write a French objective instead of translating the Spanish paradigm mechanically.",
            "The current source places a beginner morning-routine/reflexive-pronoun lesson at Master 14; qualified curriculum review must decide placement without changing saved identity silently.",
            "Grouped article, pronoun, class/classroom and preposition faces require contextual dictionary senses; Spanish feminine plural las does not map to a French gender distinction in les.",
            "The source's te question is informal singular. French tu is conditional pending a speaking-role/register decision.",
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
        print("PASS French 101 Master 14 packet build --check")
    else:
        target.write_text(text)
