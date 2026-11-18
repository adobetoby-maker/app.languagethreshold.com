#!/usr/bin/env python3
"""Rebuild inert French Roofing Foundation 9 current-source review evidence."""
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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/french-roofing/foundation-7-10-draft.json",
}
curriculum = (ROOT / FILES["curriculum"]).read_text()
source_cards = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[96:108]
source_lesson = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["9"]
passage = source_lesson["passage"]
archive_file = json.loads((ROOT / FILES["archivedDraft"]).read_text())
archived = archive_file["lessons"][2]
assert archive_file["moduleId"] == "roofing" and archive_file["stage"] == "foundation"
assert archived["n"] == 9 and len(source_cards) == len(archived["words"]) == 12
assert len(passage["target"]) == len(passage["native"]) == 6
assert len(archived["reading"]["target"]) == len(archived["reading"]["native"]) == 6

title = "Polite Requests and Commands"
objective = "Ask politely and give short, clear instructions"
focus = "¿Puede…? and usted commands for everyday verbs"
speaking = "Politely ask a crew member for two tools, then give three short instructions to set up the ladder."
for value in (title, objective, focus, speaking):
    assert value in curriculum, f"Missing current source: {value}"
assert 't("espere", "wait", "usted command of esperar")' in curriculum
assert 't("venga", "come", "usted command of venir")' in curriculum

card_holds = {
    4: "The source combines apology and excuse senses in one card. Archived 'désolé, pardon' gives two alternatives; speaker gender changes désolé/désolée. Select contextual answer and dictionary senses before scoring.",
    5: "The source combines 'careful' and 'watch out'. Archived 'attention' is a warning, while 'faites attention' is an instruction to be careful. Choose the scored face in context.",
}
line_holds = {
    3: "Archived 'désolé' assumes a speaker gender that the source Reader does not fix. Choose speaker/context or a gender-neutral apology before recording.",
    6: "The source names the roof edge. Archived 'Faites attention au bord du toit' preserves it, but this safety-critical instruction needs qualified roofing and locale review before audio or learner use.",
}
prefix = "foundation-roofing:9:fr-en"
cards = []
for index, ((es, en), draft) in enumerate(zip(source_cards, archived["words"]), 1):
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
source_rows = {"cards": source_cards, "readerSpanish": passage["target"], "readerEnglish": passage["native"]}
packet = {
    "schema": 1,
    "kind": "inert-source-decision",
    "pair": {"target": "English", "native": "French"},
    "sourceModuleId": "foundation-roofing",
    "archivedHeaderModuleId": "roofing",
    "proposedStageLocalLessonId": prefix,
    "identityDecision": "Archived Foundation/Core/Master headers share moduleId roofing. These pair-scoped row IDs are review references only; preserve account progress and saved items through a separately qualified migration before runtime use.",
    "source": {key: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for key, path in FILES.items()},
    "sourceRowsSha256": hashlib.sha256(json.dumps(source_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
    "sourceTitleEnglish": title,
    "sourceObjectiveEnglish": objective,
    "sourceFocusEnglish": focus,
    "sourceSpeakingEnglish": speaking,
    "sourceCard6NoteEnglish": "usted command of esperar",
    "sourceCard7NoteEnglish": "usted command of venir",
    "archivedFrenchFocusEnglish": archived["grammarFocusEnglish"],
    "cards": cards,
    "reader": reader,
    "sourceVerbExamples": source_lesson["verbs"],
    "archivedConditionalFrenchVerbExamples": archived["verbs"],
    "archivedSpeakingFrenchOpening": archived["speakingFrenchOpening"],
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
    print("PASS French Roofing Foundation 9 build --check")
else:
    path.write_text(output)
    print(path)
