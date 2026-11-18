#!/usr/bin/env python3
"""Build inert French 101 Master 17 evidence from the current Spanish source."""

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

# Conditional review evidence. None of these strings is selected for a learner answer or recording.
CARD_FRENCH = [
    None, "sac à dos", "livre", None, "le", None, "un", None,
    "et", "j'ai", "j'ai besoin de", None,
    "J'ai besoin du livre de Julia.",
    "Elle l'a dans son sac à dos.",
    "Je lui demande le livre après le cours.",
    "Julia me le prête pour une journée.",
    "Je le lis à la bibliothèque.",
    "Ensuite, je lui rends le livre.",
    "Je cherche le livre et je le trouve.",
    "J'ai le sac à dos et je l'ouvre.",
]
CARD_NOTES = {
    1: "Spanish me covers object and reflexive uses. French me/moi varies by syntax; choose contextual examples rather than one answer.",
    2: "Source mochila is feminine; French sac à dos is masculine. Its object pronoun is le/l', not la.",
    4: "Source clase groups class session and classroom. The Reader's después de clase means after class; cours is contextual.",
    5: "Source el is masculine singular. French le elides to l' before a vowel and requires a noun context.",
    6: "Source la groups feminine article, object it and person her. French la/l' and lui differ by grammatical role.",
    7: "Source un is masculine singular; French un must agree with the chosen noun.",
    8: "Source en covers in/on/at; French dans, sur, à and au depend on the phrase.",
    10: "Spanish tengo is I have; French j'ai is a contextual conjugation, while source pronoun placement needs separate teaching.",
    11: "Spanish necesito is I need; French avoir besoin de changes the construction and contracts in du/des.",
    12: "Source los is masculine plural article or object pronoun. French les does not encode that masculine contrast.",
    14: "Spanish lo refers to masculine libro; French l' elides le before a and son agrees with masculine sac à dos.",
    15: "Spanish le is an indirect object for Julia; French lui, unlike la, marks the recipient. Après le cours keeps the class-session sense.",
    16: "Spanish me lo and French me le preserve indirect recipient plus direct object order; por un día is duration, not purpose.",
    20: "Source feminine mochila becomes masculine sac à dos; French l' is elided le here, not evidence that both nouns share gender.",
}
READER_FRENCH = CARD_FRENCH[12:] + [
    "J'achète les cahiers et je les range.",
    "J'ai besoin des clés, mais je ne les vois pas.",
    "Ana a le crayon et elle l'utilise.",
    "Tu l'as, toi ?",
]
READER_NOTES = {
    2: "French l' hides the book's masculine pronoun shape; show le livre → le → l' explicitly in grammar.",
    3: "Keep indirect lui for Julia distinct from direct le for the book.",
    4: "French me le order is central to this lesson; validate the recipient and duration senses.",
    8: "Spanish la marks feminine mochila, but French sac à dos requires le/l'. Keep the cross-language gender change visible.",
    9: "French les for notebooks is plural without Spanish masculine agreement; this contrast needs explicit explanation.",
    10: "French les for keys is also plural without Spanish feminine agreement; include both noun contexts.",
    11: "French l' elides masculine le before utilise; preserve the pencil antecedent.",
    12: "Spanish la is feminine, but its antecedent is not explicit in this isolated line. French l' also hides gender. Qualified source/curriculum review must select the referent before scoring.",
}


def make_packet():
    source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 17)
    reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["17"]["reading"]
    archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 17)
    assert len(source["words"]) == len(CARD_FRENCH) == 20
    assert len(reading["target"]) == len(reading["native"]) == len(READER_FRENCH) == 12
    cards = [{
        "id": f"master-french-basics:17:card:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "proposedFrench": CARD_FRENCH[i - 1], "selectedFrench": None,
        "decisionRequired": i in CARD_NOTES or CARD_FRENCH[i - 1] is None,
        "decisionNote": CARD_NOTES.get(i),
    } for i, word in enumerate(source["words"], 1)]
    reader = [{
        "id": f"master-french-basics:17:reader:{i}",
        "sourceSpanish": es, "sourceEnglish": en,
        "proposedFrench": READER_FRENCH[i - 1], "selectedFrench": None,
        "decisionNote": READER_NOTES.get(i),
    } for i, (es, en) in enumerate(zip(reading["target"], reading["native"]), 1)]
    mode_refs = {"See": 1, "Recall": 2, "Hear": 4, "Type": 8, "Say": 10, "Write": 12}
    modes = [{
        "mode": mode, "sourceRef": reader[n - 1]["id"],
        "sourceEnglish": reader[n - 1]["sourceEnglish"],
        "conditionalFrench": reader[n - 1]["proposedFrench"],
        "readyForLearner": False, "recordedAudio": False,
    } for mode, n in mode_refs.items()]
    return {
        "schema": "french101-master17-source-decision-v1",
        "pairKey": "French:English", "courseId": "french-basics",
        "moduleId": "master-french-basics", "stage": "master", "n": 17,
        "stableLessonId": "master-french-basics:17",
        "stablePairId": "master-french-basics:17:fr-en",
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
            {"sourceRefs": [reader[i - 1]["id"] for i in (1, 2, 5, 7)], "focus": "le/l' for the masculine book; direct object before the verb", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (3, 4, 6)], "focus": "lui versus le; me le order and recipient", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (8, 9, 10, 11, 12)], "focus": "cross-language noun gender, plural les, elision and antecedent clarity", "readyForLearner": False},
        ],
        "conditionalSpeakingEvidence": {
            "sourceScene": reading["title"],
            "focus": "Borrow Julia's book, refer back to the book and other objects without repetition, and confirm the antecedent.",
            "sourceRefs": [reader[i - 1]["id"] for i in (1, 2, 3, 4, 5, 6, 7, 8, 12)],
            "readyForLearner": False,
        },
        "archivedRedesign": {
            "title": archived["title"], "scene": archived.get("scene"),
            "separateFromCurrentSource": True,
            "reason": "The archived Nadia/Camille folder-handoff and ambiguous-recipient repair change the source borrowed-book scene and direct-object objective; they cannot inherit this lesson's saved positions or recordings.",
        },
        "sourceDecisions": [
            "Source lo/la/los/las agreement needs French le/la/les and elision taught with explicit book, backpack, notebook and key antecedents. French les does not retain source plural gender.",
            "Source direct-object objective also includes indirect le and me lo in the Reader; choose a clear progression for le/la/les versus lui and me le rather than silently changing the source objective.",
            "Source final ¿La tienes tú? lacks an explicit antecedent in that line. Decide the intended feminine object before assigning a French answer or saved-item mapping.",
            "Source class/classroom, mochila/sac à dos, in/on/at, and article/object-pronoun headwords need contextual dictionary senses; French grammatical gender and elision must be explicit.",
            "The source places beginner direct-object pronouns at Master 17; qualified curriculum review must decide progression while preserving the stage-local progress identity.",
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
    output = json.dumps(make_packet(), ensure_ascii=False, indent=2) + "\n"
    target = HERE / "decision.json"
    if args.check:
        assert target.read_text() == output, "generated decision.json is stale"
        print("PASS French 101 Master 17 packet build --check")
    else:
        target.write_text(output)
