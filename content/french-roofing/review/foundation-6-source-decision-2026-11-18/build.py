#!/usr/bin/env python3
"""Build an inert, source-current French Roofing Foundation 6 decision packet."""
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
source_cards = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[60:72]
source_lesson = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["6"]
passage = source_lesson["passage"]
archive_file = json.loads((ROOT / FILES["archivedDraft"]).read_text())
archived = archive_file["lessons"][2]
assert archive_file["moduleId"] == "roofing" and archive_file["stage"] == "foundation"
assert archived["n"] == 6 and len(source_cards) == len(archived["words"]) == 12
assert len(passage["target"]) == len(passage["native"]) == 7
assert len(archived["reading"]["target"]) == len(archived["reading"]["native"]) == 7

title = "Present Tense"
objective = "Say what you and the crew do every day with regular verbs"
focus = "present tense of -ar, -er and -ir verbs for yo, tú, usted, nosotros, ellos"
speaking = "Describe a normal workday: when the crew arrives, what you do in the morning and afternoon."
for value in (title, objective, focus, speaking):
    assert value in curriculum, f"Missing current source text: {value}"

card_holds = {
    6: "Spanish el día and English the day include a calendar day; archived la journée focuses on a day's span or workday. Choose the card/dictionary sense before scoring.",
    8: "Archived le déjeuner means lunch in France but breakfast in Quebec, Belgium and Switzerland. The course locale and corresponding Reader 5 must be decided together.",
}
line_holds = {
    4: "Spanish tejas, English shingles and archived bardeaux need a roof-material and locale decision; the Reader specifies cutting and nailing work, so preserve the exact source action.",
    5: "The archive says only that the crew eats at noon; the source explicitly says they eat lunch at twelve. Decide the meal word and regional use with card 8.",
    6: "The archive uses plural old materials for source singular old material. Qualified roofing/French review should decide the mass or plural sense before selecting this line.",
}
prefix = "foundation-roofing:6:fr-en"
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
        "archivedNoteEnglish": draft.get("noteEnglish"),
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
    "identityDecision": "The archived Foundation header uses roofing, also used for archived Core and Master. Proposed pair-scoped row IDs are review evidence only; preserve existing account progress and saved items through a separately qualified migration before runtime use.",
    "source": {key: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for key, path in FILES.items()},
    "sourceRowsSha256": hashlib.sha256(json.dumps(source_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
    "sourceTitleEnglish": title,
    "sourceObjectiveEnglish": objective,
    "sourceFocusEnglish": focus,
    "sourceSpeakingEnglish": speaking,
    "archivedFrenchFocusEnglish": archived["grammarFocusEnglish"],
    "cards": cards,
    "reader": reader,
    "sourceVerbExamples": source_lesson["verbs"],
    "archivedConditionalFrenchVerbExamples": archived["verbs"],
    "archivedSpeakingFrenchOpening": archived["speakingFrenchOpening"],
    "curriculumDecision": "Current source teaches Spanish regular -ar/-er/-ir present forms. The archived French adapts this to -er verbs, including manger and nettoyer spelling changes; a qualified curriculum/French decision must preserve the intended progression without presenting Spanish conjugation as French.",
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
    print("PASS French Roofing Foundation 6 build --check")
else:
    path.write_text(output)
    print(path)
