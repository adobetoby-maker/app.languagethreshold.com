#!/usr/bin/env python3
"""Build the inert Japanese Roofing Foundation 7 source comparison."""

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
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[72:84]
source = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["7"]["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
assert len(words) == len(archived["cards"]) == 12
assert len(source["target"]) == len(source["native"]) == len(archived["reader"]) == 7

card_holds = {
    5: "Source cuánto groups how much and how many. Archived どのくらい can express amount or duration but does not cover every counted-number sense; choose a contextual headword.",
    8: "Source cuál is which, while どれ asks which one from options. Keep the isolated card unset until a qualified question-word contrast is chosen.",
    11: "Source English says boss and Spanish jefe. Archived 班長 specifically means crew lead; the role could be narrower than the source. Obtain a source/trade decision.",
}
reader_holds = {
    2: "Source asks who the boss is; archived 班長 narrows the role to crew lead. Align this with card 11 after qualified review.",
    5: "Source English says shingles while Spanish tejas can name roof tiles; archived シングル材 specifically names shingle material. Decide the source roofing material and quantity wording before selecting Japanese.",
    6: "Source says harness; archived フルハーネス adds full-body specificity. Qualified roofing/source review should confirm that specification before selecting Japanese.",
}

cards = []
for n, ((es, en), draft) in enumerate(zip(words, archived["cards"]), 1):
    cards.append({
        "id": f"foundation-roofing:7:ja-en:card:{n}",
        "legacySourceRef": f"foundation-roofing:7:ja-en:cards:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "candidateJapanese": None if n in card_holds else draft["ja"],
        "archivedJapanese": draft["ja"],
        "archivedEnglish": draft["en"],
        "reviewNote": card_holds.get(n),
        "reviewed": False,
    })

reader = []
for n, (es, en, draft) in enumerate(zip(source["target"], source["native"], archived["reader"]), 1):
    reader.append({
        "id": f"foundation-roofing:7:ja-en:line:{n}",
        "legacySourceRef": f"foundation-roofing:7:ja-en:reader:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
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
    "lessonId": "foundation-roofing:7:ja-en",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for name, path in FILES.items()},
    "sourceEnglishObjective": archived["sourceEnglishObjective"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "curriculumAdaptationNote": "Source teaches jobsite question words. Japanese 誰, どこ, いつ, 何, どうやって, なぜ, どれ and quantity forms need qualified contextual contrasts, including polite か questions and trade role/material senses.",
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
    print("PASS Japanese Roofing Foundation 7 packet build --check")
else:
    path.write_text(output)
    print(path)
