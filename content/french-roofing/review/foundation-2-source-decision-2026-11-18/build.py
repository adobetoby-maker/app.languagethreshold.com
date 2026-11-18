#!/usr/bin/env python3
"""Rebuild the inert French Roofing Foundation 2 source decision packet."""

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
source_cards = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[12:24]
source_reader = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["2"]["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
assert len(source_cards) == len(archived["words"]) == 12
assert len(source_reader["target"]) == len(source_reader["native"]) == len(archived["reading"]["target"]) == len(archived["reading"]["native"]) == 8
assert archived["n"] == 2

source_title = "Numbers, Time and Measurements"
source_objective = "Count, tell time, and give measurements and quantities on the job"
source_focus = "numbers 0 to 1,000, clock time, feet, inches and pounds"
source_speaking = "Tell the crew lead what time you start, how many bundles you need, and one measurement."
for value in (source_title, source_objective, source_focus, source_speaking):
    assert value in curriculum, f"Current source text missing: {value}"

card_holds = {
    5: "The source means a US pound in this job measurement. French livre can mean an imperial pound in Quebec and a colloquial 500 g in France; choose locale and exact unit notation before scoring or recording.",
    6: "The source means a bundle of shingles. Archived paquet is a general package; select the job/supplier headword and quantity context with qualified roofing terminology review.",
}
reader_holds = {
    4: "Thirty bundles of shingles uses the same unresolved trade headword as card 6; keep the source quantity and material exact.",
    5: "Seventy US pounds must not become an unqualified French 500 g livre; decide locale and unit expression before selecting a French line.",
}

cards = []
for n, ((es, en), draft) in enumerate(zip(source_cards, archived["words"]), 1):
    assert draft["en"] == en, f"Archived card {n} English drift"
    cards.append({
        "proposedRowId": f"foundation-roofing:2:fr-en:card:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "kind": draft["kind"],
        "selectedFrench": None,
        "conditionalFrench": None if n in card_holds else draft["fr"],
        "archivedFrench": draft["fr"],
        "reviewNote": card_holds.get(n),
        "reviewed": False,
    })

reader = []
for n, (es, en, old_es, old_en) in enumerate(zip(source_reader["target"], source_reader["native"], archived["reading"]["target"], archived["reading"]["native"]), 1):
    assert old_en == en, f"Archived Reader {n} English drift"
    reader.append({
        "proposedRowId": f"foundation-roofing:2:fr-en:line:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "selectedFrench": None,
        "conditionalFrench": None if n in reader_holds else old_es,
        "archivedFrench": old_es,
        "reviewNote": reader_holds.get(n),
        "reviewed": False,
    })

packet = {
    "schema": 1,
    "kind": "inert-source-decision",
    "pair": {"target": "English", "native": "French"},
    "sourceModuleId": "foundation-roofing",
    "archivedHeaderModuleId": "roofing",
    "proposedStageLocalLessonId": "foundation-roofing:2:fr-en",
    "identityDecision": "The archived packet header uses moduleId roofing for Foundation, Core and Master. These row IDs are proposals for review, not app, saved-item or progress keys. Qualify one stage-specific migration before wiring; never alias existing learner progress to them automatically.",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for name, path in FILES.items()},
    "sourceTitleEnglish": source_title,
    "sourceObjectiveEnglish": source_objective,
    "sourceFocusEnglish": source_focus,
    "sourceSpeakingEnglish": source_speaking,
    "archivedFrenchObjective": archived["objectiveEnglish"],
    "archivedFrenchFocus": archived["grammarFocusEnglish"],
    "cards": cards,
    "reader": reader,
    "sourceVerbExamples": json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["2"]["verbs"],
    "conditionalFrenchVerbExamples": archived["verbs"],
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
    assert path.read_text() == output, "Decision packet drifted from pinned source or archived draft"
    print("PASS French Roofing Foundation 2 build --check")
else:
    path.write_text(output)
    print(path)
