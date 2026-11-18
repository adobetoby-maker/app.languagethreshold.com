#!/usr/bin/env python3
"""Rebuild inert French Roofing Foundation 10 source/identity decision evidence."""
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
source_cards = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[108:120]
source_lesson = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["10"]
passage = source_lesson["passage"]
archive_file = json.loads((ROOT / FILES["archivedDraft"]).read_text())
archived = archive_file["lessons"][3]
assert archive_file["moduleId"] == "roofing" and archive_file["stage"] == "foundation"
assert archived["n"] == 10 and len(source_cards) == len(archived["words"]) == 12
assert len(passage["target"]) == len(passage["native"]) == len(archived["reading"]["target"]) == 7

title = "Words You Already Know and Getting Help"
objective = "Use Spanish words that look like English and ask for help when you are stuck"
focus = "cognates (-ción, -dad, -ente) and survival phrases"
speaking = "Report a small accident on the roof, ask for help, and ask what one word means."
for value in (title, objective, focus, speaking):
    assert value in curriculum, f"Missing current source: {value}"

card_holds = {
    11: "The source's Call 911 is a US emergency-number scene without an explicit location in this lesson. Confirm the source setting and locale before selecting a French scored phrase or recording; preserve 911 in the pinned source.",
}
line_holds = {
    2: "The source calls this a fall-protection inspection. Qualified roofing safety review must confirm the context and terminology before a recorded/scored French line.",
    5: "Preserve the source's conditional serious-injury/911/ambulance meaning. The source scene lacks an explicit location; settle locale and emergency wording before selecting a recording script.",
    7: "The current source asks what Spanish caída means, while the archived French scene and its rewritten English support ask what French chute means. This is a curriculum/language-adaptation decision, not exact English parity; keep the archived line unselected.",
}
prefix = "foundation-roofing:10:fr-en"
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
for index, (es, en, old_fr, old_en, old_source_en) in enumerate(zip(
    passage["target"], passage["native"],
    archived["reading"]["target"], archived["reading"]["native"],
    archived["reading"]["sourceNative"]
), 1):
    assert old_source_en == en, f"Archived Reader {index} source-English drift"
    if index != 7:
        assert old_en == en, f"Archived Reader {index} English drift"
    else:
        assert old_en != en, "Expected explicit caída/chute English adaptation"
    reader.append({
        "proposedRowId": f"{prefix}:line:{index}",
        "sourcePosition": index,
        "sourceSpanish": es,
        "sourceEnglish": en,
        "archivedFrench": old_fr,
        "archivedAdaptedEnglish": old_en,
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
    "pair": {"target": "French", "native": "English"},
    "sourceModuleId": "foundation-roofing",
    "archivedHeaderModuleId": "roofing",
    "proposedStageLocalLessonId": prefix,
    "identityDecision": "Archived Foundation/Core/Master headers share moduleId roofing. Proposed pair-scoped row IDs are review references only; preserve saved items and account progress through a separately qualified migration before runtime use.",
    "source": {key: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for key, path in FILES.items()},
    "sourceRowsSha256": hashlib.sha256(json.dumps(source_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
    "sourceTitleEnglish": title,
    "sourceObjectiveEnglish": objective,
    "sourceFocusEnglish": focus,
    "sourceSpeakingEnglish": speaking,
    "sourceCognateNotesEnglish": ["-ción words are usually '-tion'", "-dad words are usually '-ty'"],
    "archivedFrenchFocusEnglish": archived["grammarFocusEnglish"],
    "archivedObjectiveEnglish": archived["objectiveEnglish"],
    "cards": cards,
    "reader": reader,
    "sourceVerbExamples": source_lesson["verbs"],
    "archivedConditionalFrenchVerbExamples": archived["verbs"],
    "archivedSpeakingFrenchOpening": archived["speakingFrenchOpening"],
    "archivedRegionalNotesEnglish": archived["regionalNotesEnglish"],
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
    print("PASS French Roofing Foundation 10 build --check")
else:
    path.write_text(output)
    print(path)
