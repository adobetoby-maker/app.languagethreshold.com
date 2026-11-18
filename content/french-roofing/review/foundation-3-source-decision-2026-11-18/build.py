#!/usr/bin/env python3
"""Rebuild the inert French Roofing Foundation 3 source decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/french-roofing/foundation-1-3-draft.json",
}
curriculum = (ROOT / FILES["curriculum"]).read_text()
source_cards = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[24:36]
source_lesson = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["3"]
source_reader = source_lesson["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
assert archived["n"] == 3
assert len(source_cards) == len(archived["words"]) == 12
assert len(source_reader["target"]) == len(source_reader["native"]) == len(archived["reading"]["target"]) == len(archived["reading"]["native"]) == 7

source_title = "Ser and Estar"
source_objective = "Use the two verbs for 'to be' to describe people, conditions and safety"
source_focus = "ser for what something is, estar for its condition or location"
source_speaking = "Describe the roof to a crew member: say whether it is wet, slippery or safe, and who the boss is."
for value in (source_title, source_objective, source_focus, source_speaking):
    assert value in curriculum, f"Current source text missing: {value}"
assert archived["speakingEnglish"] == source_speaking

pair_id = "foundation-roofing:3:fr-en"
card_holds = {
    2: "The bare source word 'safe' does not establish whether a roof or harness is safe. Archived 'sans danger' asserts absence of danger; qualify the intended dictionary sense and job context before selecting this face.",
}
reader_holds = {
    4: "Source says the air is cold. Archived 'Il fait froid le matin' means the weather is cold and archived English changes 'The air' to 'It'. Retain air as grammatical subject in the eventual French line, or obtain an explicit source/curriculum decision.",
    7: "Source claims a ready harness is safe. Archived 'il est sans danger' strengthens that to 'without danger'. A qualified roofing safety decision must resolve the equipment/inspection claim; no French line is selected.",
}

cards = []
for n, ((es, en), draft) in enumerate(zip(source_cards, archived["words"]), 1):
    assert draft["en"] == en, f"Archived card {n} English drift"
    cards.append({
        "proposedRowId": f"{pair_id}:card:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "kind": draft["kind"],
        "selectedFrench": None,
        "conditionalFrench": None if n in card_holds else draft["fr"],
        "archivedFrench": draft["fr"],
        "archivedNoteEnglish": draft.get("noteEnglish"),
        "reviewNote": card_holds.get(n),
        "reviewed": False,
    })

reader = []
for n, (es, en, old_fr, old_en) in enumerate(zip(source_reader["target"], source_reader["native"], archived["reading"]["target"], archived["reading"]["native"]), 1):
    assert old_en == en or n in reader_holds, f"Unexpected archived Reader {n} English drift"
    reader.append({
        "proposedRowId": f"{pair_id}:line:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "selectedFrench": None,
        "conditionalFrench": None if n in reader_holds else old_fr,
        "archivedFrench": old_fr,
        "archivedEnglish": old_en,
        "archivedEnglishDiffersFromSource": old_en != en,
        "reviewNote": reader_holds.get(n),
        "reviewed": False,
    })

packet = {
    "schema": 1,
    "kind": "inert-source-decision",
    "pair": {"target": "English", "native": "French"},
    "sourceModuleId": "foundation-roofing",
    "archivedHeaderModuleId": "roofing",
    "proposedStageLocalLessonId": pair_id,
    "identityDecision": "The archived header uses roofing for Foundation, Core and Master. Proposed IDs here are review references only; no app, saved-item or progress key is changed. Qualify a stage-specific migration preserving existing learner progress before wiring.",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for name, path in FILES.items()},
    "sourceTitleEnglish": source_title,
    "sourceObjectiveEnglish": source_objective,
    "sourceFocusEnglish": source_focus,
    "sourceSpeakingEnglish": source_speaking,
    "archivedFrenchTitleEnglish": archived["titleEnglish"],
    "archivedFrenchObjectiveEnglish": archived["objectiveEnglish"],
    "archivedFrenchFocusEnglish": archived["grammarFocusEnglish"],
    "cards": cards,
    "reader": reader,
    "sourceVerbExamples": source_lesson["verbs"],
    "conditionalFrenchVerbExamples": archived["verbs"],
    "archivedGrammarTeachingEnglish": archived["grammarTeachingEnglish"],
    "archivedRegionalNotesEnglish": archived["regionalNotesEnglish"],
    "modeEvidence": {mode: {"authoredPromptTargetPair": False, "readyForLearner": False} for mode in ("see", "recall", "hear", "type", "say", "write")},
    "speakingEvidence": {"archivedFrenchOpening": archived["speakingFrenchOpening"], "readyForLearner": False},
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
    print("PASS French Roofing Foundation 3 build --check")
else:
    path.write_text(output)
    print(path)
