#!/usr/bin/env python3
"""Rebuild inert French Roofing Foundation 7 current-source decision evidence."""
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
cards_source = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[72:84]
passage = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["7"]["passage"]
source_verbs = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["7"]["verbs"]
archive_file = json.loads((ROOT / FILES["archivedDraft"]).read_text())
archived = archive_file["lessons"][0]
assert archive_file["moduleId"] == "roofing" and archive_file["stage"] == "foundation"
assert archived["n"] == 7 and len(cards_source) == len(archived["words"]) == 12
assert len(passage["target"]) == len(passage["native"]) == 7
assert len(archived["reading"]["target"]) == len(archived["reading"]["native"]) == 7

title = "Questions"
objective = "Ask the questions you need on any job"
focus = "qué, quién, dónde, cuándo, cuánto, cómo, por qué"
speaking = "Ask a new crew lead five questions: where things are, who is in charge, and when you start."
for value in (title, objective, focus, speaking):
    assert value in curriculum, f"Missing current source: {value}"

card_holds = {
    1: "The source headword 'what' is context-free. Archived qu'est-ce que is a question construction; standalone quoi and other syntax need contextual dictionary and mode decisions.",
    5: "The source 'how much, how many' can stand alone. Archived combien de requires a following noun; select contextual forms together with Reader line 5.",
    8: "The source 'which' is context-free. Archived quel, quelle shows only singular gender forms; plural forms and noun agreement need an authored activity and dictionary decision.",
    10: "The source says singular 'the material'. Archived les matériaux is plural; do not score or record it until number and construction-material sense are settled.",
    11: "The source 'boss' may refer to employer or crew lead. Archived chef needs a qualified role/register decision before selection.",
}
line_holds = {
    1: "The exact source begins 'Today is my first day'; the archived French omits today. Restore the time anchor before a selected answer or recording.",
    2: "Archived chef needs the same boss-versus-crew-lead role decision as card 11.",
    4: "The source says singular material; archived les matériaux is plural. Align this line with card 10 and the intended jobsite sense.",
    5: "Archived les matériaux changes source singular material, and bardeaux narrows shingles by material/locale. Qualified trade and French review must settle both before recording.",
}
prefix = "foundation-roofing:7:fr-en"
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
    "pair": {"target": "French", "native": "English"},
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
        "questionForms": "French question words and constructions require context: quoi, qu'est-ce que, combien, combien de, quel/quelle/quels/quelles.",
        "reader1": "Aujourd'hui, c'est mon premier jour et j'ai des questions. This restores the source time anchor; it is not selected.",
        "register": "The archive mixes formal inversion and spoken on/est-ce que. A qualified French reviewer should decide the lesson register and six authored prompts.",
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
    print("PASS French Roofing Foundation 7 build --check")
else:
    path.write_text(output)
    print(path)
