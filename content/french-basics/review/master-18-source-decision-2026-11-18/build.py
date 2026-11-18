#!/usr/bin/env python3
"""Build inert French 101 Master 18 source and decision evidence."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
MASTER = ROOT / "src/data/core60/es/master-spanish-basics.json"
PRACTICE = ROOT / "src/data/spanish-basics-practice.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-101/master-16-18-redesign-draft.json"
SOURCES = (MASTER, PRACTICE, ARCHIVE)

# Review candidates only. No French answer is selected for teaching, scoring or audio.
CARD_FRENCH = [
    "cahier", "le", None, "un", "un cahier", None, None, "enseignante",
    "amis", "bibliothèque", "maison", "avec",
    "Hier, j’ai étudié avec Julia.",
    "Nous avons terminé les devoirs à cinq heures.",
    "Diego a acheté du pain au magasin.",
    "Nous avons mangé dans le parc.",
    "Julia a écrit un message à sa sœur.",
    "Ensuite, nous sommes rentrés à pied.",
    "Hier, j’ai étudié à la bibliothèque.",
    "Ana a acheté un cahier.",
]
CARD_NOTES = {
    2: "French le must be attached to a masculine noun and may elide; source el is a masculine singular article.",
    3: "Spanish la groups feminine article, it and her; French la/l’ as article or object cannot be one context-free scored face.",
    4: "Spanish un and French un align only with masculine nouns; contextual noun agreement remains required.",
    6: "Source en groups in/on/at; French dans, sur, à or au depends on the phrase.",
    7: "Spanish las groups feminine plural article and object them; French les is gender-neutral and role-dependent.",
    8: "Professora marks a female teacher; French enseignante preserves gender, while professeure may be preferred by locale/register.",
    13: "Spanish preterite estudié uses a simple completed past; proposed French passé composé requires a curriculum decision.",
    14: "Source tarea is singular homework/task; les devoirs is natural homework usage but changes grammatical number.",
    15: "Source en la tienda means at the store; au magasin is conditional for location and store sense.",
    16: "Source en el parque is in the park; dans le parc keeps interior sense, but au parc may be idiomatic by context.",
    17: "French sa agrees with sœur; source su does not mark the possessed noun’s gender.",
    18: "Rentrer à pied preserves walking home but could imply return rather than simply walking toward home; qualify before selection.",
    19: "French à la bibliothèque uses a locative preposition where source uses en; assess exact sense in context.",
}
READER_FRENCH = CARD_FRENCH[12:] + [
    "Nous avons mangé à la cafétéria.",
    "Luis a écrit un message.",
    "Mes amis ont parlé avec l’enseignante.",
    "As-tu terminé les devoirs hier ?",
]
READER_NOTES = {
    1: "Source preterite versus French passé composé needs a curriculum decision; no answer is selected.",
    2: "Source singular tarea versus proposed plural devoirs needs meaning and saved-card review.",
    3: "At the store is proposed au magasin, retaining the store rather than a new destination.",
    4: "Source in the park is proposed dans le parc; au parc is a contextual alternative.",
    5: "Sa agrees with sœur in French; source su is not gender-marked.",
    6: "Rentrer à pied retains walking home but adds return nuance; qualified choice required.",
    9: "Source cafetería is cafeteria, not a café; cafétéria is a conditional locale choice.",
    11: "Source profesora is female teacher; enseignante preserves gender; professeure is a contextual alternative.",
    12: "Source informal singular terminaste is proposed as informal singular as-tu; register needs review.",
}


def make_packet():
    source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 18)
    reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["18"]["reading"]
    archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 18)
    assert len(source["words"]) == len(CARD_FRENCH) == 20
    assert len(reading["target"]) == len(reading["native"]) == len(READER_FRENCH) == 12
    cards = [{
        "id": f"master-french-basics:18:card:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "proposedFrench": CARD_FRENCH[i - 1], "selectedFrench": None,
        "decisionRequired": i in CARD_NOTES or CARD_FRENCH[i - 1] is None,
        "decisionNote": CARD_NOTES.get(i),
    } for i, word in enumerate(source["words"], 1)]
    reader = [{
        "id": f"master-french-basics:18:reader:{i}",
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
        "schema": "french101-master18-source-decision-v1",
        "pairKey": "French:English", "courseId": "french-basics",
        "moduleId": "master-french-basics", "stage": "master", "n": 18,
        "stableLessonId": "master-french-basics:18",
        "stablePairId": "master-french-basics:18:fr-en",
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
            {"sourceRefs": [reader[i - 1]["id"] for i in (1, 7, 12)], "focus": "completed-past narration and informal singular question", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (2, 5, 11)], "focus": "past forms, homework number, possessive gender and teacher term", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (3, 4, 6, 9)], "focus": "store, park, cafeteria and walking home locatives", "readyForLearner": False},
        ],
        "conditionalSpeakingEvidence": {
            "sourceScene": reading["title"],
            "focus": "Tell a classmate in order what happened yesterday with Julia, Diego and Ana, then answer whether homework was finished.",
            "sourceRefs": [reader[i - 1]["id"] for i in (1, 2, 3, 4, 5, 6, 7, 8, 12)],
            "readyForLearner": False,
        },
        "archivedRedesign": {
            "title": archived["title"], "scene": archived.get("scene"),
            "separateFromCurrentSource": True,
            "reason": "The archived rainy museum outing changes the source yesterday-at-school events, characters and completed-past objective; it cannot inherit this lesson's saved positions or recordings.",
        },
        "sourceDecisions": [
            "The source objective teaches Spanish preterite for completed past actions; French passé composé is proposed only conditionally. Qualified curriculum review must decide the adaptation and Master-stage placement.",
            "Source tarea is singular while natural French homework often uses plural les devoirs; choose a contextual phrase and dictionary/saved-item mapping.",
            "Source la, las and en group senses that cannot map to a single context-free French scored answer; show articles, object pronouns, gender and locatives directly in final teaching.",
            "Source profesora is a female teacher; qualify enseignante versus professeure by locale/register and preserve the female reference.",
            "Source walk home, cafeteria, store, park and informal singular final question need exact meaning and register review before selecting French.",
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
        print("PASS French 101 Master 18 packet build --check")
    else:
        target.write_text(content)
