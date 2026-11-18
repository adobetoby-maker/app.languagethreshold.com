#!/usr/bin/env python3
"""Build inert French 101 Master 15 source and decision evidence."""

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

# Conditional translation candidates only; none is selected for teaching, scoring or recording.
CARD_FRENCH = [
    "table", "sac à dos", None, "est", "il y a", "le", None, "une",
    "une table", None, None, None,
    "La bibliothèque est à côté du café.",
    "La salle d’étude est derrière la bibliothèque.",
    "Il y a une table devant la fenêtre.",
    "Mon sac à dos est sous cette table.",
    "La salle de classe est près de la porte principale.",
    "Le parc est loin de ce bâtiment.",
    "La salle de classe est au deuxième étage.",
    "La bibliothèque est près du café.",
]
CARD_NOTES = {
    2: "Spanish mochila is feminine, while French sac à dos is masculine; downstream article and possessive choices need contextual review.",
    3: "Source clase groups a class session with a classroom; French cours, classe and salle de classe are distinct.",
    4: "Spanish está marks condition/location; French est also expresses identity, so an isolated card changes the contrast.",
    6: "Spanish el marks masculine singular; French le can elide and must be linked to a noun.",
    7: "Spanish la groups feminine article, object it and person her; one French la face hides role and elision.",
    8: "Spanish una is feminine singular; French une depends on the noun selected.",
    10: "Source en groups in/on/at; French dans, sur, à and au depend on the location phrase.",
    11: "Spanish mi is gender-neutral; French mon/ma/mes depend on the possessed noun and phonology.",
    12: "Spanish de groups of/from and contracts with el; French de/du/des and locative de need phrase context.",
    16: "Source feminine mochila becomes masculine sac à dos; mon agrees with sac, not the speaker.",
    17: "Source la clase means the classroom here; salle de classe preserves that room sense.",
    19: "Source segundo piso is the second floor; French deuxième étage is a conditional locale choice.",
}
READER_FRENCH = [
    "La bibliothèque est à côté du café.",
    "La salle d’étude est derrière la bibliothèque.",
    "Il y a une table devant la fenêtre.",
    "Mon sac à dos est sous cette table.",
    "La salle de classe est près de la porte principale.",
    "Le parc est loin de ce bâtiment.",
    "La salle de classe est au deuxième étage.",
    "La bibliothèque est près du café.",
    "Le magasin est loin de l’école.",
    "Le sac à dos est sous la table.",
    "Ana est devant la porte.",
    "Luis est derrière Ana.",
]
READER_NOTES = {
    1: "Spanish al lado del café and French à côté du café both use contractions; teach the French contraction directly.",
    4: "Mon agrees with masculine sac à dos despite feminine Spanish mochila.",
    5: "Source means classroom, not class session; salle de classe is a conditional room-specific choice.",
    7: "Piso means floor; French étage and floor-number conventions need locale review.",
    9: "Source tienda is a store; magasin preserves the source without introducing a new destination.",
}


def make_packet():
    source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 15)
    reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["15"]["reading"]
    archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 15)
    assert len(source["words"]) == len(CARD_FRENCH) == 20
    assert len(reading["target"]) == len(reading["native"]) == len(READER_FRENCH) == 12
    cards = [{
        "id": f"master-french-basics:15:card:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "proposedFrench": CARD_FRENCH[i - 1], "selectedFrench": None,
        "decisionRequired": i in CARD_NOTES or CARD_FRENCH[i - 1] is None,
        "decisionNote": CARD_NOTES.get(i),
    } for i, word in enumerate(source["words"], 1)]
    reader = [{
        "id": f"master-french-basics:15:reader:{i}",
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
        "schema": "french101-master15-source-decision-v1",
        "pairKey": "French:English", "courseId": "french-basics",
        "moduleId": "master-french-basics", "stage": "master", "n": 15,
        "stableLessonId": "master-french-basics:15",
        "stablePairId": "master-french-basics:15:fr-en",
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
            {"sourceRefs": [reader[i - 1]["id"] for i in (1, 2, 8)], "focus": "à côté de, derrière, près de; contractions and place", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (3, 4, 10)], "focus": "il y a versus est; under/in front and noun gender", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (5, 6, 7)], "focus": "classroom, distance and second-floor locale", "readyForLearner": False},
        ],
        "conditionalSpeakingEvidence": {
            "sourceScene": reading["title"],
            "focus": "Give campus directions using the library, study room, café, classroom and park.",
            "sourceRefs": [reader[i - 1]["id"] for i in (1, 2, 3, 5, 6, 7, 8)],
            "readyForLearner": False,
        },
        "archivedRedesign": {
            "title": archived["title"], "scene": archived.get("scene"),
            "separateFromCurrentSource": True,
            "reason": "The archived replacement-entrance guidance changes the source campus locations and objective; it cannot inherit this lesson's saved positions or recordings.",
        },
        "sourceDecisions": [
            "The source Spanish objective uses en as in/on/at by context; French requires phrase-specific à, dans, sur and au, not a slash string scored as one answer.",
            "Source cerca de, lejos de, delante de, detrás de and de + el contraction need a French spatial-language sequence with direct grammatical examples.",
            "Source class/classroom, mochila/sac à dos and gendered articles/possessives need contextual dictionary and saved-item decisions.",
            "The source is an elementary directions lesson placed at Master 15; qualified curriculum review must decide progression without silently changing the stable progress identity.",
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
        print("PASS French 101 Master 15 packet build --check")
    else:
        target.write_text(text)
