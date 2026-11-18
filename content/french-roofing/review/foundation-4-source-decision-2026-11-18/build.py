#!/usr/bin/env python3
"""Build an inert French Roofing Foundation 4 decision from current source."""

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
source_cards = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[36:48]
source_lesson = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["4"]
source_reader = source_lesson["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
assert archived["n"] == 4
assert len(source_cards) == len(archived["words"]) == 12
assert len(source_reader["target"]) == len(source_reader["native"]) == len(archived["reading"]["target"]) == len(archived["reading"]["native"]) == 7

title = "Have, There Is, Need and Want"
objective = "Say what you have, what is there, what you need and what you want"
focus = "tener, hay, necesitar, querer and 'hay que'"
speaking = "Tell the crew lead what you have, what you need, and what is missing on the roof."
for value in (title, objective, focus, speaking):
    assert value in curriculum, f"Current source missing: {value}"

card_holds = {
    5: "The source headword is singular material; archived les matériaux is plural building materials and excludes equipment. Qualify the context and dictionary sense before selecting a face.",
    6: "The source explicitly combines trash and debris. Archived les débris covers debris but not all trash; select a context-specific equivalent or split the senses without losing the source meaning.",
    12: "The source uses hay que usar el arnés and the English face says wear the harness. Archived porter is a conditional rendering; qualified trade/safety review must preserve the obligation and avoid implying a harness alone is a complete fall-protection system.",
}
reader_holds = {
    3: "Source cold water is stronger than archived eau fraîche (cool/fresh water). Choose exact temperature wording before selecting the French line.",
    5: "Archived bardeaux is a region-dependent shingle term; qualify material and locale without changing the source nail/shingle relationship.",
    6: "Source has singular material on the truck and debris on the ground; archived des matériaux selects plural construction materials. Resolve the material sense and locale.",
}
cards = []
for n, ((es, en), old) in enumerate(zip(source_cards, archived["words"]), 1):
    assert old["en"] == en, f"Archived card {n} English drift"
    cards.append({
        "proposedRowId": f"foundation-roofing:4:fr-en:card:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "kind": old["kind"],
        "selectedFrench": None,
        "conditionalFrench": None if n in card_holds else old["fr"],
        "archivedFrench": old["fr"],
        "reviewNote": card_holds.get(n),
        "reviewed": False,
    })
reader = []
for n, (es, en, old_fr, old_en) in enumerate(zip(source_reader["target"], source_reader["native"], archived["reading"]["target"], archived["reading"]["native"]), 1):
    assert old_en == en, f"Archived Reader {n} English drift"
    reader.append({
        "proposedRowId": f"foundation-roofing:4:fr-en:line:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "selectedFrench": None,
        "conditionalFrench": None if n in reader_holds else old_fr,
        "archivedFrench": old_fr,
        "reviewNote": reader_holds.get(n),
        "reviewed": False,
    })
packet = {
    "schema": 1,
    "kind": "inert-source-decision",
    "pair": {"target": "English", "native": "French"},
    "sourceModuleId": "foundation-roofing",
    "archivedHeaderModuleId": "roofing",
    "proposedStageLocalLessonId": "foundation-roofing:4:fr-en",
    "identityDecision": "Archived Foundation, Core and Master headers share moduleId roofing and have no stable row IDs. These pair-scoped Foundation 4 IDs are proposals only; no app, saved-item or progress key is changed. Qualify a stage-specific identity and migration preserving existing progress before any wiring.",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for name, path in FILES.items()},
    "sourceTitleEnglish": title,
    "sourceObjectiveEnglish": objective,
    "sourceFocusEnglish": focus,
    "sourceSpeakingEnglish": speaking,
    "archivedFrenchObjective": archived["objectiveEnglish"],
    "archivedFrenchFocus": archived["grammarFocusEnglish"],
    "cards": cards,
    "reader": reader,
    "sourceVerbExamples": source_lesson["verbs"],
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
    assert path.read_text() == output, "Decision drifted from pinned source or archived draft"
    print("PASS French Roofing Foundation 4 build --check")
else:
    path.write_text(output)
    print(path)
