#!/usr/bin/env python3
"""Build the inert Japanese Roofing Foundation 5 source comparison."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/foundation-4-6-draft.json",
}
curriculum = (ROOT / FILES["curriculum"]).read_text()
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[48:60]
source = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["5"]["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
assert len(words) == len(archived["cards"]) == 12
assert len(source["target"]) == len(source["native"]) == len(archived["reader"]) == 7

card_ambiguities = {
    8: "Source temprano is early in time; archived 早く can mean early or quickly. Reader 4 separately teaches fast work. Choose a context-specific headword.",
    9: "Source only says I am going to go up; archived Japanese adds the roof, which appears later in the Reader but not this card.",
}
reader_ambiguities = {
    5: "Source asks for help with the ladder without naming an action; archived Japanese adds carrying it. Choose the intended action or preserve the open request.",
}

cards = []
for n, ((es, en), draft) in enumerate(zip(words, archived["cards"]), 1):
    cards.append({
        "id": f"foundation-roofing:5:ja-en:card:{n}",
        "legacySourceRef": f"foundation-roofing:5:ja-en:cards:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "candidateJapanese": None if n in card_ambiguities else draft["ja"],
        "archivedJapanese": draft["ja"],
        "archivedEnglish": draft["en"],
        "reviewNote": card_ambiguities.get(n),
        "reviewed": False,
    })

reader = []
for n, (es, en, draft) in enumerate(zip(source["target"], source["native"], archived["reader"]), 1):
    reader.append({
        "id": f"foundation-roofing:5:ja-en:line:{n}",
        "legacySourceRef": f"foundation-roofing:5:ja-en:reader:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "candidateJapanese": None if n in reader_ambiguities else draft["ja"],
        "archivedJapanese": draft["ja"],
        "archivedEnglish": draft["en"],
        "reviewNote": reader_ambiguities.get(n) or (
            "Source reports that the crew works fast because of heat. Preserve it as a speaker report, not as reviewed heat-safety instruction."
            if n == 4 else
            "Source 'another roof' is rendered as another roof job; confirm the work scope in qualified roofing review."
            if n == 7 else None
        ),
        "reviewed": False,
    })

assert set(archived["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
packet = {
    "schema": 1,
    "kind": "inert-source-review",
    "pair": {"target": "Japanese", "native": "English"},
    "stageId": "foundation-roofing",
    "lessonId": "foundation-roofing:5:ja-en",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for name, path in FILES.items()},
    "sourceEnglishObjective": archived["sourceEnglishObjective"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "curriculumAdaptationNote": "Spanish ir a + verb and poder are source objectives; Japanese non-past plans and polite help requests need a distinct qualified curriculum decision.",
    "cards": cards,
    "reader": reader,
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
    print("PASS Japanese Roofing Foundation 5 packet build --check")
else:
    path.write_text(output)
    print(path)
