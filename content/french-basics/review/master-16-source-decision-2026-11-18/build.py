#!/usr/bin/env python3
"""Generate inert French 101 Master 16 source decision evidence."""
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

# Review candidates only; no face is selected for learners, scoring or audio.
CARD_FRENCH = [
    "livre", None, None, None, None, None, "amis", None, "bibliothèque", None,
    "frère", "un livre",
    "En ce moment, je lis à la maison.",
    "Julia prépare le dîner en ce moment.",
    "Demain, nous allons rendre visite à Diego.",
    "Il étudie en ce moment.",
    "Après, il va acheter un livre.",
    "Nous allons parler après le dîner.",
    "Demain, je vais étudier l’espagnol.",
    "Ana va acheter un livre.",
]
CARD_NOTES = {
    2: "Spanish está marks condition/location; French est also marks identity. A context-free scored equivalent hides that contrast.",
    3: "Spanish el is masculine singular; French le/l’ depends on the following sound and noun.",
    4: "Spanish la groups feminine article, object it and person her; French requires role, gender and elision in context.",
    5: "Spanish un and French un depend on the noun; a universal face needs dictionary context.",
    6: "Spanish en groups in/on/at; French à, dans and sur differ by phrase.",
    7: "Amigos may be mixed-gender friends; French amis/amies requires group context.",
    8: "Spanish de groups of/from; French de/du/des/d’ depends on phrase and contraction.",
    10: "Spanish estoy is condition/location or part of an ongoing-action construction; French suis versus a present-tense verb or être en train de needs context.",
    13: "Spanish estoy leyendo is progressive; ordinary French present plus en ce moment expresses ongoing action. Qualified review may prefer être en train de lire.",
    14: "Spanish está preparando is progressive; candidate French present plus en ce moment preserves ongoing time without a mechanical auxiliary calque.",
    15: "Spanish visitar a Diego has personal a; French rendre visite à Diego uses a governed preposition. Decide visit/rendre visite and register in context.",
    18: "Source vamos a hablar is planned future; French aller + infinitive preserves the structure and must not be read as motion.",
    19: "Source Spanish-language object is español; French l’espagnol is the language, not a new curriculum target.",
}
READER_FRENCH = CARD_FRENCH[12:] + [
    "Nous allons manger à la maison.",
    "Luis va appeler son frère.",
    "Mes amis vont visiter le musée.",
    "Est-ce que tu vas venir à la bibliothèque ?",
]
READER_NOTES = {
    1: "Ongoing present must contrast clearly with planned future in the same lesson.",
    3: "Keep the Diego visit and tomorrow time marker; Spanish personal a is not a route direction.",
    7: "Study Spanish is the source meaning; do not silently change the object to French.",
    10: "Spanish su brother resolves to Luis's brother in this scene; French son agrees with frère.",
    11: "Amigos may include more than male friends; choose amis/amies with scene context.",
    12: "Source singular informal vas requires a French tu/register decision; candidate uses informal tu.",
}


def make_packet():
    source = next(x for x in json.loads(MASTER.read_text())["lessons"] if x["n"] == 16)
    reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["16"]["reading"]
    archived = next(x for x in json.loads(ARCHIVE.read_text())["lessons"] if x["n"] == 16)
    assert len(source["words"]) == len(CARD_FRENCH) == 20
    assert len(reading["target"]) == len(reading["native"]) == len(READER_FRENCH) == 12
    cards = [{
        "id": f"master-french-basics:16:card:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "proposedFrench": CARD_FRENCH[i-1], "selectedFrench": None,
        "decisionRequired": i in CARD_NOTES or CARD_FRENCH[i-1] is None,
        "decisionNote": CARD_NOTES.get(i),
    } for i, word in enumerate(source["words"], 1)]
    reader = [{
        "id": f"master-french-basics:16:reader:{i}",
        "sourceSpanish": es, "sourceEnglish": en,
        "proposedFrench": READER_FRENCH[i-1], "selectedFrench": None,
        "decisionNote": READER_NOTES.get(i),
    } for i, (es, en) in enumerate(zip(reading["target"], reading["native"]), 1)]
    mode_refs = {"See": 1, "Recall": 3, "Hear": 5, "Type": 7, "Say": 9, "Write": 12}
    modes = [{
        "mode": mode, "sourceRef": reader[n-1]["id"],
        "sourceEnglish": reader[n-1]["sourceEnglish"],
        "conditionalFrench": reader[n-1]["proposedFrench"],
        "readyForLearner": False, "recordedAudio": False,
    } for mode, n in mode_refs.items()]
    return {
        "schema": "french101-master16-source-decision-v1",
        "pairKey": "French:English", "courseId": "french-basics",
        "moduleId": "master-french-basics", "stage": "master", "n": 16,
        "stableLessonId": "master-french-basics:16",
        "stablePairId": "master-french-basics:16:fr-en",
        "sourceFilesSha256": {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in SOURCES},
        "sourceTitleEnglish": source["title"], "sourceObjectiveEnglish": source["objective"],
        "sourceFocusEnglish": source["focus"], "sourceSpeakingEnglish": source["speaking"],
        "sourceGrammarEnglish": source["grammar"], "sourceReaderTitleSpanish": reading["title"],
        "cards": cards, "reader": reader,
        "conditionalModeEvidence": modes,
        "conditionalFormEvidence": [
            {"sourceRefs": [reader[i-1]["id"] for i in (1,2,4)], "focus": "ongoing present with now; present versus en train de", "readyForLearner": False},
            {"sourceRefs": [reader[i-1]["id"] for i in (3,7,8)], "focus": "planned future aller + infinitive; infinitive remains unchanged", "readyForLearner": False},
            {"sourceRefs": [reader[i-1]["id"] for i in (5,10,12)], "focus": "afterward, possessive son and informal future question", "readyForLearner": False},
        ],
        "conditionalSpeakingEvidence": {
            "sourceScene": reading["title"],
            "focus": "Contrast what is happening now with plans for tomorrow or afterward using the source home, dinner, Diego, book and library scenes.",
            "sourceRefs": [reader[i-1]["id"] for i in (1,2,3,5,7,8,12)],
            "readyForLearner": False,
        },
        "archivedRedesign": {
            "title": archived["title"], "scene": archived.get("scene"),
            "separateFromCurrentSource": True,
            "reason": "The archived poster deadline and delayed printing scene is different from the source now-versus-tomorrow home, dinner and visit scenes; saved positions and recordings cannot transfer.",
        },
        "sourceDecisions": [
            "Qualified source and curriculum review must resolve the source objective's ir + a + infinitive alongside present progressive examples; preserve this now/planned-future contrast under the stable Master 16 identity.",
            "Qualified French review must choose ordinary present versus être en train de for ongoing action, and aller + infinitive for future plans; teach the chosen forms directly without a literal Spanish auxiliary calque.",
            "Qualified dictionary review must resolve context-dependent está, estoy, el, la, en, de, amigos and possessive su senses before scoring or saved-item mapping.",
            "The source includes no clinical vocabulary; do not invent a clinical scenario. Any later clinical term must be taught directly and checked for precise meaning.",
        ],
        "selectedDecision": None, "normalProjectionAllowed": False, "audioScript": None,
        "gates": {key: False for key in (
            "reviewed", "qualifiedFrenchReview", "qualifiedSourceReview", "qualifiedCurriculumReview", "qualifiedDictionaryReview",
            "ownerRouteRegistered",
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
        print("PASS French 101 Master 16 packet build --check")
    else:
        target.write_text(text)
