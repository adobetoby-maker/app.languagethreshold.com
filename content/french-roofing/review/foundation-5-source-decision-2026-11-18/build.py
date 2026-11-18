#!/usr/bin/env python3
"""Rebuild inert French Roofing Foundation 5 current-source decision evidence."""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
FILES = {
    "curriculum": "src/data/foundation-roofing-curriculum.ts",
    "reader": "public/lesson-content/es/foundation-roofing.json",
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/french-roofing/foundation-4-6-draft.json",
}
curriculum = (ROOT / FILES["curriculum"]).read_text()
cards_source = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[48:60]
passage = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["5"]["passage"]
source_verbs = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["5"]["verbs"]
archive_file = json.loads((ROOT / FILES["archivedDraft"]).read_text())
archived = archive_file["lessons"][1]
assert archive_file["moduleId"] == "roofing" and archive_file["stage"] == "foundation"
assert archived["n"] == 5 and len(cards_source) == len(archived["words"]) == 12
assert len(passage["target"]) == len(passage["native"]) == 7
assert len(archived["reading"]["target"]) == len(archived["reading"]["native"]) == 7

title = "Go, Do and Can"
objective = "Talk about plans, actions and what you can do"
focus = "ir, ir a + verb for plans, hacer, poder"
speaking = "Explain your plan for today on the jobsite and ask a crew member if they can help you."
for value in (title, objective, focus, speaking):
    assert value in curriculum, f"Missing current source: {value}"

card_holds = {
    4: "English 'after, later' groups two senses. Archived après covers after; private correction proposed après, plus tard. Choose one or split the card and dictionary senses before scoring.",
    10: "English does not specify tu/vous. Archive uses vous; a later private candidate used tu. Set register and locale before selecting the answer or recording.",
}
line_holds = {
    4: "Exact source links hot weather to working fast. Keep the source anchor visible, but qualified roofing safety review must decide the teaching line before selecting French.",
    5: "Archive uses vous and a private candidate uses tu for the crew request. Decide register and the linked card 10 together.",
}
prefix = "foundation-roofing:5:fr-en"
cards = []
for index, ((es, en), draft) in enumerate(zip(cards_source, archived["words"]), 1):
    assert draft["en"] == en, f"Archived card {index} English drift"
    cards.append({
        "proposedRowId": f"{prefix}:card:{index}",
        "sourcePosition": index,
        "sourceSpanish": es,
        "sourceEnglish": en,
        "kind": draft["kind"],
        "archivedFrench": draft["fr"],
        "conditionalFrench": None if index in card_holds else draft["fr"],
        "selectedFrench": None,
        "audioScript": None,
        "reviewNote": card_holds.get(index),
        "reviewed": False,
    })

reader = []
for index, (es, en, old_fr, old_en) in enumerate(zip(
    passage["target"], passage["native"],
    archived["reading"]["target"], archived["reading"]["native"]
), 1):
    assert old_en == en, f"Archived Reader {index} English drift"
    reader.append({
        "proposedRowId": f"{prefix}:line:{index}",
        "sourcePosition": index,
        "sourceSpanish": es,
        "sourceEnglish": en,
        "archivedFrench": old_fr,
        "conditionalFrench": None if index in line_holds else old_fr,
        "selectedFrench": None,
        "audioScript": None,
        "reviewNote": line_holds.get(index),
        "reviewed": False,
    })

source_rows = {"cards": cards_source, "readerSpanish": passage["target"], "readerEnglish": passage["native"]}
packet = {
    "schema": 1,
    "kind": "inert-source-decision",
    "pair": {"target": "English", "native": "French"},
    "sourceModuleId": "foundation-roofing",
    "archivedHeaderModuleId": "roofing",
    "proposedStageLocalLessonId": prefix,
    "identityDecision": "All archived stages use moduleId roofing. Proposed pair-scoped row IDs are review evidence only; preserve existing saved items and account progress through a separately qualified migration before runtime use.",
    "source": {key: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for key, path in FILES.items()},
    "sourceRowsSha256": hashlib.sha256(json.dumps(source_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
    "sourceTitleEnglish": title,
    "sourceObjectiveEnglish": objective,
    "sourceFocusEnglish": focus,
    "sourceSpeakingEnglish": speaking,
    "archivedFrenchFocusEnglish": archived["grammarFocusEnglish"],
    "cards": cards,
    "reader": reader,
    "sourceVerbExamples": source_verbs,
    "archivedConditionalFrenchVerbExamples": archived["verbs"],
    "archivedSpeakingFrenchOpening": archived["speakingFrenchOpening"],
    "privateCandidateCorrectionsForReview": {
        "card4": "après, plus tard",
        "reader1": "Aujourd'hui, on va dans une nouvelle maison.",
        "register": "A private draft uses tu where the archive uses vous; neither is selected.",
        "conjugation": "On takes third-person singular: on va, on fait; nous allons is a distinct form.",
    },
    "modeEvidence": {mode: {"authoredPromptTargetPair": False, "readyForLearner": False} for mode in ("see", "recall", "hear", "type", "say", "write")},
    "speakingEvidence": {"readyForLearner": False},
    "audioScript": None,
    "reviewGates": {key: False for key in ("qualifiedFrench", "qualifiedRoofing", "dictionarySenses", "sourceDecision", "stageIdentity", "sixModes", "speaking", "audioListening", "learnerRuntime", "scoring", "offline", "savedProgress", "browserAcceptance", "v4Acceptance")},
    "reviewed": False,
    "registered": False,
    "audioRegistered": False,
}
output = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
path = HERE / "decision.json"
if "--check" in sys.argv:
    assert path.read_text() == output, "Decision packet drifted from pinned source or archive"
    print("PASS French Roofing Foundation 5 build --check")
else:
    path.write_text(output)
    print(path)
