#!/usr/bin/env python3
"""Build inert French 101 Master 13 source-decision evidence from pinned rows."""

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

# Conditional examples only. These are not selected answers or recording scripts.
CARD_FRENCH = [
    "cahier", "livre", "le", None, "un", "un cahier", None,
    "j’ai", None, None, None, None,
    "Nous devons étudier pour l’examen.",
    "J’ai besoin de réviser les questions.",
    "Julia doit terminer deux pages.",
    "Diego a besoin de son livre.",
    "Nous pouvons nous entraîner ensemble à la maison.",
    "Nous n’avons pas besoin de tout apprendre aujourd’hui.",
    "J’ai besoin de réviser les verbes.",
    "Je dois finir les devoirs.",
]
CARD_NOTES = {
    3: "Spanish el marks masculine singular; French le has elision and contextual article behavior.",
    4: "Source la groups feminine article, object it and her; no one French isolated face preserves all roles.",
    7: "Source en groups in/on/at; French choice depends on location, time and phrase.",
    8: "Source tengo is stand-alone I have; French j’ai needs a subject and clitic agreement context.",
    9: "Source necesito is stand-alone I need; French avoir besoin de needs a complement, while devoir can signal obligation.",
    10: "Spanish los is masculine plural article/object; French les loses the source gender marking.",
    11: "Spanish las is feminine plural article/object; French les loses the source gender marking.",
    12: "Source para groups for and in order to; French pour needs a phrase-level object or infinitive context.",
    14: "Need in the source is distinct from obligation; review avoir besoin de plus infinitive in this classroom idiom.",
    16: "Spanish su may be his or her; Diego's ownership supports son livre in this scene, subject to source review.",
    17: "Practice together is conditional as nous entraîner ensemble; a general pratiquer translation may shift the classroom sense.",
    18: "No tenemos que expresses lack of obligation, not prohibition. French n’avons pas besoin de keeps that distinction.",
    20: "Source la tarea is the homework; French les devoirs plural changes noun number convention, not task count.",
}
READER_FRENCH = CARD_FRENCH[12:] + [
    "Ana a besoin d’un cahier.",
    "Nous devons arriver à huit heures.",
    "Luis doit lire deux pages.",
    "As-tu besoin d’aide pour cette question ?",
]
READER_NOTES = {
    2: "Need versus obligation distinction requires explicit French objective and qualified review.",
    4: "Spanish su is context-dependent; proposed son livre follows Diego, not a universal su gloss.",
    5: "Practice together may call for nous entraîner or réviser together; decide from the source task.",
    6: "Source says do not have to, not must not; keep non-obligation explicit.",
    8: "French les devoirs is the idiomatic homework noun; confirm number and saved card sense.",
    10: "Llegar a las ocho means arrive at eight, not study at eight.",
    12: "Spanish necesitas is informal singular; tu is conditional on the source speaking relationship.",
}


def make_packet():
    source = next(row for row in json.loads(MASTER.read_text())["lessons"] if row["n"] == 13)
    reading = json.loads(PRACTICE.read_text())["master-spanish-basics"]["13"]["reading"]
    archived = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["n"] == 13)
    assert len(source["words"]) == len(CARD_FRENCH) == 20
    assert len(reading["target"]) == len(reading["native"]) == len(READER_FRENCH) == 12
    cards = [{
        "id": f"master-french-basics:13:card:{i}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "proposedFrench": CARD_FRENCH[i - 1], "selectedFrench": None,
        "decisionRequired": i in CARD_NOTES or CARD_FRENCH[i - 1] is None,
        "decisionNote": CARD_NOTES.get(i),
    } for i, word in enumerate(source["words"], 1)]
    reader = [{
        "id": f"master-french-basics:13:reader:{i}",
        "sourceSpanish": es, "sourceEnglish": en,
        "proposedFrench": READER_FRENCH[i - 1], "selectedFrench": None,
        "decisionNote": READER_NOTES.get(i),
    } for i, (es, en) in enumerate(zip(reading["target"], reading["native"]), 1)]
    mode_refs = {"See": 1, "Recall": 2, "Hear": 3, "Type": 4, "Say": 6, "Write": 12}
    modes = [{
        "mode": mode, "sourceRef": reader[n - 1]["id"],
        "sourceEnglish": reader[n - 1]["sourceEnglish"],
        "conditionalFrench": reader[n - 1]["proposedFrench"],
        "readyForLearner": False, "recordedAudio": False,
    } for mode, n in mode_refs.items()]
    return {
        "schema": "french101-master13-source-decision-v1",
        "pairKey": "French:English", "courseId": "french-basics",
        "moduleId": "master-french-basics", "stage": "master", "n": 13,
        "stableLessonId": "master-french-basics:13",
        "stablePairId": "master-french-basics:13:fr-en",
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
            {"sourceRefs": [reader[i - 1]["id"] for i in (1, 3, 8)], "focus": "devoir + infinitive expresses obligation; preserve the source having-to-do meaning", "readyForLearner": False},
            {"sourceRefs": [reader[i - 1]["id"] for i in (2, 4, 7, 9)], "focus": "avoir besoin de + noun/infinitive expresses need; distinguish it from devoir", "readyForLearner": False},
            {"sourceRefs": [reader[5]["id"]], "focus": "lack of obligation is not prohibition: n’avons pas besoin de versus ne devons pas", "readyForLearner": False},
        ],
        "conditionalSpeakingEvidence": {
            "sourceScene": reading["title"],
            "focus": "Prepare for an exam by separating needs from obligations and asking for help.",
            "sourceRefs": [reader[i - 1]["id"] for i in (1, 2, 3, 6, 12)],
            "readyForLearner": False,
        },
        "archivedRedesign": {
            "title": archived["title"], "scene": archived.get("scene"),
            "separateFromCurrentSource": True,
            "reason": "The archived small-exhibition coordinator task changes the source exam-preparation scene and objective.",
        },
        "sourceDecisions": [
            "The Spanish source contrasts necesitar + infinitive (need) with tener que + infinitive (obligation). French avoir besoin de and devoir need distinct authored grammar and non-obligation examples.",
            "The source places a beginner need/obligation lesson at Master 13; curriculum placement needs review without changing saved lesson identity.",
            "Grouped articles, object pronouns, en, para and gendered Spanish plurals require contextual French dictionary and scoring senses.",
            "The source's informal necesitas and possessive su require person/register/context decisions before French answers are selected.",
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
        print("PASS French 101 Master 13 packet build --check")
    else:
        target.write_text(text)
