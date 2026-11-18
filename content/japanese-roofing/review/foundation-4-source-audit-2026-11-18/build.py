#!/usr/bin/env python3
"""Build the inert Japanese Roofing Foundation 4 source comparison."""

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
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[36:48]
source = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["4"]["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
assert len(words) == len(archived["cards"]) == 12
assert len(source["target"]) == len(source["native"]) == len(archived["reader"]) == 7

card_ambiguities = {
    4: "The source specifies a hard hat; archived ヘルメット alone means a generic helmet. Select the trade term after qualified review.",
    6: "The source gives trash OR debris as contextual glosses; archived ごみや破片 can suggest both. Choose the intended material and Japanese term in context.",
    7: "The source says a generic tarp; archived ブルーシート specifies a blue sheet. Review material/locale usage before selecting a face.",
    12: "The source says harness; archived フルハーネス specifies a full-body harness. Do not narrow a PPE requirement without roofing/source review.",
}
reader_ambiguities = {
    4: "The source says a hard hat; archived ヘルメット alone means a generic helmet. Match the card 4 trade-term decision.",
    5: "The source says shingles; archived シングル材 names asphalt shingles specifically. Confirm the roofing material before choosing Japanese.",
    6: "The source says debris on the ground; archived ごみや破片 adds trash and a second item. Confirm the intended construction-debris term.",
    7: "The source says a generic tarp; archived ブルーシート narrows the material to a blue sheet. The source's jobsite action also needs trade review.",
}

cards = []
for n, ((es, en), draft) in enumerate(zip(words, archived["cards"]), 1):
    cards.append({
        "id": f"foundation-roofing:4:ja-en:card:{n}",
        "legacySourceRef": f"foundation-roofing:4:ja-en:cards:{n}",
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
        "id": f"foundation-roofing:4:ja-en:line:{n}",
        "legacySourceRef": f"foundation-roofing:4:ja-en:reader:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "candidateJapanese": None if n in reader_ambiguities else draft["ja"],
        "archivedJapanese": draft["ja"],
        "archivedEnglish": draft["en"],
        "reviewNote": reader_ambiguities.get(n),
        "reviewed": False,
    })

assert set(archived["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
packet = {
    "schema": 1,
    "kind": "inert-source-review",
    "pair": {"target": "Japanese", "native": "English"},
    "stageId": "foundation-roofing",
    "lessonId": "foundation-roofing:4:ja-en",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for name, path in FILES.items()},
    "sourceEnglishObjective": archived["sourceEnglishObjective"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "curriculumAdaptationNote": "The Spanish source contrasts hay and tengo. Japanese あります, 持っています, 必要です and 欲しいです are contextual proposals, not one-to-one forms; qualified curriculum review must approve the lesson progression.",
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
    print("PASS Japanese Roofing Foundation 4 packet build --check")
else:
    path.write_text(output)
    print(path)
