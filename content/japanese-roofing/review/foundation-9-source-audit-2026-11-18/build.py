#!/usr/bin/env python3
"""Build the inert Japanese Roofing Foundation 9 source comparison."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/foundation-7-10-draft.json",
}
curriculum = (ROOT / FILES["curriculum"]).read_text()
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[96:108]
source = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["9"]["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
assert len(words) == len(archived["cards"]) == 12
assert len(source["target"]) == len(source["native"]) == 6
assert len(archived["reader"]) == 7, "archived extra turn needs separate review"

card_holds = {
    1: "Source por favor is a general please; archived お願いします fits a request but is not interchangeable in every context. Select a contextual Japanese phrase after qualified review.",
    5: "Source cuidado is careful/watch out as an alert; archived 気をつけてください is a complete polite instruction. Keep the isolated alert sense visible.",
}
reader_holds = {
    1: "Spanish con permiso and English excuse me while coming through with a ladder carry a passing/access sense. Archived すみません is broad apology/attention; confirm whether this setting needs 通ります or 失礼します before selecting the line.",
    2: "Source explicitly includes por favor/please. Archived polite question omits a separate request marker; qualified Japanese review should decide whether its polite register preserves the request force.",
}

cards = []
for n, ((es, en), draft) in enumerate(zip(words, archived["cards"]), 1):
    cards.append({
        "id": f"foundation-roofing:9:ja-en:card:{n}",
        "legacySourceRef": f"foundation-roofing:9:ja-en:cards:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "selectedJapanese": None,
        "candidateJapanese": None if n in card_holds else draft["ja"],
        "archivedJapanese": draft["ja"],
        "archivedEnglish": draft["en"],
        "reviewNote": card_holds.get(n),
        "reviewed": False,
    })

reader = []
for n, (es, en, draft) in enumerate(zip(source["target"], source["native"], archived["reader"]), 1):
    reader.append({
        "id": f"foundation-roofing:9:ja-en:line:{n}",
        "legacySourceRef": f"foundation-roofing:9:ja-en:reader:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "selectedJapanese": None,
        "candidateJapanese": None if n in reader_holds else draft["ja"],
        "archivedJapanese": draft["ja"],
        "archivedEnglish": draft["en"],
        "reviewNote": reader_holds.get(n),
        "reviewed": False,
    })

assert set(archived["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
packet = {
    "schema": 1,
    "kind": "inert-source-review",
    "pair": {"target": "Japanese", "native": "English"},
    "stageId": "foundation-roofing",
    "lessonId": "foundation-roofing:9:ja-en",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for name, path in FILES.items()},
    "sourceEnglishObjective": archived["sourceEnglishObjective"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "audioScript": None,
    "curriculumAdaptationNote": "Current source teaches polite tool requests and short instructions. Japanese ～てください and ～てもらえますか express different request forms. Confirm the alert sense of cuidado and the passing sense of con permiso in context before selecting scored faces.",
    "cards": cards,
    "reader": reader,
    "archivedExtraReaderTurns": [{"archivedIndex": 7, "archivedJapanese": archived["reader"][6]["ja"],
                                  "archivedEnglish": archived["reader"][6]["en"],
                                  "sourceAligned": False,
                                  "reviewNote": "Archived crew-lead reply has no seventh turn in current Spanish/English Reader; it must not inherit Reader, audio or saved-item identity."}],
    "archivedModeLabels": {mode: {"label": label, "authoredPromptTargetPair": False, "readyForLearner": False}
                           for mode, label in archived["modes"].items()},
    "reviewGates": {key: False for key in ["qualifiedJapanese", "qualifiedRoofing", "dictionarySenses",
                                            "sourceDecision", "audioListening", "learnerRuntime", "scoring",
                                            "offline", "savedProgress", "browserAcceptance", "v4Acceptance"]},
    "reviewed": False,
    "registered": False,
    "audioRegistered": False,
}
output = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
path = HERE / "packet.json"
if "--check" in sys.argv:
    assert path.read_text() == output, "packet drifted from pinned source or archived draft"
    print("PASS Japanese Roofing Foundation 9 packet build --check")
else:
    path.write_text(output)
    print(path)
