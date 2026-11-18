#!/usr/bin/env python3
"""Build the inert Japanese Roofing Foundation 8 source comparison."""

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
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[84:96]
source = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["8"]["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
assert len(words) == len(archived["cards"]) == 12
assert len(source["target"]) == len(source["native"]) == len(archived["reader"]) == 7

card_holds = {
    3: "Source nada is general 'nothing'; archived 何もありません asserts that nothing exists. The isolated card needs a context-neutral or qualified phrase decision.",
    5: "Source menos is 'less' and can also apply to countable items in context; archived 少なく is an adverbial form. Choose a contextual headword, especially beside source fewer shingles.",
    6: "Source otro covers 'another' and 'other'; archived もう一つ is one more item. Keep the isolated face null until its full range is represented or a specific sense is selected.",
    11: "Source says only harness; archived フルハーネス adds full-body specificity. A qualified roofing/source reviewer must decide the equipment term before selecting it.",
}
reader_holds = {
    2: "Source says nobody goes up without a harness; archived text adds roof destination and full-body harness specificity. Keep both additions visible for source and roofing review.",
    6: "English source says shingles while Spanish tejas can name roof tiles. Archived シングル材 selects shingles. Resolve the intended material and quantity expression with a qualified source/roofing reviewer.",
}

cards = []
for n, ((es, en), draft) in enumerate(zip(words, archived["cards"]), 1):
    cards.append({
        "id": f"foundation-roofing:8:ja-en:card:{n}",
        "legacySourceRef": f"foundation-roofing:8:ja-en:cards:{n}",
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
        "id": f"foundation-roofing:8:ja-en:line:{n}",
        "legacySourceRef": f"foundation-roofing:8:ja-en:reader:{n}",
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
    "lessonId": "foundation-roofing:8:ja-en",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for name, path in FILES.items()},
    "sourceEnglishObjective": archived["sourceEnglishObjective"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "audioScript": None,
    "curriculumAdaptationNote": "Source contrasts never, nobody, nothing, not yet and more/less while reporting supplies. Japanese negative-polarity expressions such as 決して～ません, 誰も～ません and 何も～ません require a complete negative predicate, not standalone scored words. Confirm the countable-material and equipment senses.",
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
    print("PASS Japanese Roofing Foundation 8 packet build --check")
else:
    path.write_text(output)
    print(path)
