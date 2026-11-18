#!/usr/bin/env python3
"""Build the inert Japanese Roofing Foundation 6 source comparison."""

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
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[60:72]
source = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["6"]["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
assert len(words) == len(archived["cards"]) == 12
assert len(source["target"]) == len(source["native"]) == len(archived["reader"]) == 7

card_ambiguities = {
    6: "Source el día names a day; archived 一日 can mean one full day or all day. Choose a context-specific standalone headword.",
    7: "Source la semana names the week; archived 一週間 expresses a duration of one week. The Reader uses five days per week, so choose the time sense.",
    10: "Source says only we go up at seven; archived Japanese adds the roof. Decide whether this added destination is justified by the Reader context.",
}
reader_ambiguities = {
    3: "Source says we go up at seven; archived Japanese adds the roof. Preserve the source's unspecified destination or obtain a source decision.",
}

cards = []
for n, ((es, en), draft) in enumerate(zip(words, archived["cards"]), 1):
    cards.append({
        "id": f"foundation-roofing:6:ja-en:card:{n}",
        "legacySourceRef": f"foundation-roofing:6:ja-en:cards:{n}",
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
        "id": f"foundation-roofing:6:ja-en:line:{n}",
        "legacySourceRef": f"foundation-roofing:6:ja-en:reader:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "candidateJapanese": None if n in reader_ambiguities else draft["ja"],
        "archivedJapanese": draft["ja"],
        "archivedEnglish": draft["en"],
        "reviewNote": reader_ambiguities.get(n) or (
            "Source describes the coworker cutting shingles and speaker driving nails; preserve as a workday report, not an independently reviewed work procedure."
            if n == 4 else None
        ),
        "reviewed": False,
    })

assert set(archived["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
packet = {
    "schema": 1,
    "kind": "inert-source-review",
    "pair": {"target": "Japanese", "native": "English"},
    "stageId": "foundation-roofing",
    "lessonId": "foundation-roofing:6:ja-en",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for name, path in FILES.items()},
    "sourceEnglishObjective": archived["sourceEnglishObjective"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "curriculumAdaptationNote": "Source objective teaches Spanish regular verbs for habitual crew work. Japanese ～ます, ～ています, time marker に and weekly expressions need a distinct qualified curriculum decision, including the work-habit versus current-action sense.",
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
    print("PASS Japanese Roofing Foundation 6 packet build --check")
else:
    path.write_text(output)
    print(path)
