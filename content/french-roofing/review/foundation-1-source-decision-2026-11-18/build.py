#!/usr/bin/env python3
"""Build the inert, source-exact French Roofing Foundation 1 decision packet."""
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
first = curriculum.split("const units: Unit[] = [", 1)[1].split("\n  },", 1)[0]
def field(name):
    match = re.search(r'^\s*' + name + r': "([^"]+)"', first, re.M)
    assert match, f"Missing current source {name}"
    return match.group(1)

words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', first, re.M)
assert len(words) == 12, "Foundation 1 must have the current 12 source cards"
passage = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["1"]["passage"]
assert len(passage["target"]) == len(passage["native"]) == 7
archived_file = json.loads((ROOT / FILES["archivedDraft"]).read_text())
archived = archived_file["lessons"][0]
assert archived["n"] == 1 and len(archived["words"]) == 12
assert len(archived["reading"]["target"]) == len(archived["reading"]["native"]) == 7
assert archived_file["moduleId"] == "roofing" and archived_file["stage"] == "foundation"

card_holds = {
    2: "Spanish teja and the English source span shingle and roof tile; archived le bardeau selects a shingle in a regional context. Qualified roofing/locale/dictionary review must decide the card face.",
}
line_holds = {
    4: "Source teja spans shingle and roof tile; archived le bardeau selects a narrower regional material.",
    5: "The current English/Spanish source asks for ladder in Spanish; the archived French scene asks in French. This is a curriculum adaptation, not an exact translation. Decide source objective and English support line together.",
}
prefix = "foundation-roofing:1:fr-en"
cards = []
for index, ((spanish, english), draft) in enumerate(zip(words, archived["words"]), 1):
    assert draft["en"] == english, f"Archived card {index} English diverged"
    cards.append({
        "proposedId": f"{prefix}:card:{index}",
        "sourcePosition": index,
        "sourceSpanish": spanish,
        "sourceEnglish": english,
        "archivedFrench": draft["fr"],
        "candidateFrench": None if index in card_holds else draft["fr"],
        "selectedFrench": None,
        "audioScript": None,
        "reviewNote": card_holds.get(index),
        "reviewed": False,
    })

reader = []
for index, (spanish, english, draft_french, draft_english) in enumerate(zip(
    passage["target"], passage["native"],
    archived["reading"]["target"], archived["reading"]["native"]
), 1):
    assert draft_english == english or index == 5, f"Archived Reader {index} English diverged unexpectedly"
    reader.append({
        "proposedId": f"{prefix}:line:{index}",
        "sourcePosition": index,
        "sourceSpanish": spanish,
        "sourceEnglish": english,
        "archivedFrench": draft_french,
        "archivedEnglish": draft_english,
        "candidateFrench": None if index in line_holds else draft_french,
        "selectedFrench": None,
        "audioScript": None,
        "reviewNote": line_holds.get(index),
        "reviewed": False,
    })

source_rows = {"cards": words, "readerSpanish": passage["target"], "readerEnglish": passage["native"]}
packet = {
    "schema": 1,
    "kind": "inert-source-decision",
    "pair": {"target": "French", "native": "English"},
    "stageId": "foundation-roofing",
    "proposedLessonId": prefix,
    "source": {key: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for key, path in FILES.items()},
    "sourceRowsSha256": hashlib.sha256(json.dumps(source_rows, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
    "sourceTitleEnglish": field("title"),
    "sourceObjectiveEnglish": field("objective"),
    "sourceFocusEnglish": field("focus"),
    "sourceSpeakingEnglish": field("speaking"),
    "archivedFrenchObjectiveEnglish": archived["objectiveEnglish"],
    "archivedFrenchFocusEnglish": archived["grammarFocusEnglish"],
    "curriculumAdaptationDecision": "Spanish-vowel and in-Spanish help objectives must be adapted for French; the current source remains exact provenance. Qualified curriculum/French review must choose the learner objective, examples, and English support together.",
    "progressIdentity": {
        "sourceStageId": "foundation-roofing",
        "archivedDraftModuleId": "roofing",
        "proposedPairScopedLessonId": prefix,
        "rowIdsAreProposedOnly": True,
        "legacyProgressImportApproved": False,
        "progressWriteEnabled": False,
        "decision": "Do not import legacy roofing-only saved items or progress into French Foundation; verify existing account-scoped keys and migration behavior before registration.",
    },
    "cards": cards,
    "reader": reader,
    "archivedModeEvidence": {"sixAuthoredPromptTargetPairs": False, "learnerReady": False},
    "reviewGates": {key: False for key in ["qualifiedFrench", "qualifiedRoofing", "dictionarySenses",
                                            "sourceDecision", "identityApproved", "audioListening", "learnerRuntime",
                                            "scoring", "offline", "savedProgress", "browserAcceptance", "v4Acceptance"]},
    "reviewed": False,
    "registered": False,
    "audioRegistered": False,
}

output = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
path = HERE / "packet.json"
if "--check" in sys.argv:
    assert path.read_text() == output, "Packet drifted from current source or archived draft"
    print("PASS French Roofing Foundation 1 packet build --check")
else:
    path.write_text(output)
    print(path)
