#!/usr/bin/env python3
"""Rebuild inert French Roofing Foundation 8 current-source decision evidence."""
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
source_cards = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[84:96]
source_lesson = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["8"]
passage = source_lesson["passage"]
archive_file = json.loads((ROOT / FILES["archivedDraft"]).read_text())
archived = archive_file["lessons"][1]
assert archive_file["moduleId"] == "roofing" and archive_file["stage"] == "foundation"
assert archived["n"] == 8 and len(source_cards) == len(archived["words"]) == 12
assert len(passage["target"]) == len(passage["native"]) == 7
assert len(archived["reading"]["target"]) == len(archived["reading"]["native"]) == 7

title = "No, Never and How Much"
objective = "Say no, not yet and never, and ask for more or less"
focus = "no, nunca, nadie, nada, todavía no, más, menos, otro"
speaking = "Tell a crew member what is not ready yet, that nobody goes up without a harness, and ask for more material."
for value in (title, objective, focus, speaking):
    assert value in curriculum, f"Missing current source: {value}"

card_holds = {
    4: "The source unbound 'more' is broader than archived plus de, which means more of a quantity; choose contextual card and dictionary senses before scoring.",
    5: "The source unbound 'less' is broader than archived moins de, which requires a following quantity; choose contextual card and dictionary senses.",
    6: "Source 'another, other' is one card; archive groups un autre, une autre and d'autres. The current Spanish note also prohibits un otro. Resolve form/gender/number before a single scored face.",
    7: "Source 'still, yet' needs context. Archived encore can mean still or again; yet in the negative phrase is pas encore. Decide isolated card sense and Reader linkage.",
    8: "Source 'a little' is unbound; archived un peu de expects a following noun. The Reader has countable nails, where a few is quelques clous.",
    11: "The source and archived phrase say nobody goes up without a harness. Qualified roofing safety review must distinguish wearing a harness from complete fall-protection authorization before promotion.",
    12: "Source bundle and archived paquet need roofing material/packaging sense review, tied to the Reader's bundle of shingles.",
}
line_holds = {
    2: "The source's harness requirement is retained, but a harness alone is not an approved complete fall-protection procedure; qualified roofing safety review is required.",
    5: "Archived paquet and quelques clous render source bundle and a few more nails. Confirm bundle/shingle trade sense and countable quantity before recording.",
    6: "Archived bardeaux narrows source shingles to a material/region-specific term; settle roofing locale and dictionary sense before recording.",
}
prefix = "foundation-roofing:8:fr-en"
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
    "pair": {"target": "French", "native": "English"},
    "sourceModuleId": "foundation-roofing",
    "archivedHeaderModuleId": "roofing",
    "proposedStageLocalLessonId": prefix,
    "identityDecision": "Archived Foundation/Core/Master headers share moduleId roofing. These pair-scoped row IDs are review references only; preserve saved items and account progress through a separately qualified migration before runtime use.",
    "source": {key: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()} for key, path in FILES.items()},
    "sourceRowsSha256": hashlib.sha256(json.dumps(source_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
    "sourceTitleEnglish": title,
    "sourceObjectiveEnglish": objective,
    "sourceFocusEnglish": focus,
    "sourceSpeakingEnglish": speaking,
    "sourceCard6NoteEnglish": "never 'un otro'",
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
    print("PASS French Roofing Foundation 8 build --check")
else:
    path.write_text(output)
    print(path)
