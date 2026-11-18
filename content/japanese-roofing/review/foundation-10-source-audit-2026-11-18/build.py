#!/usr/bin/env python3
"""Build the inert Japanese Roofing Foundation 10 source comparison."""

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
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[108:120]
source = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["10"]["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][3]
assert len(words) == len(archived["cards"]) == 12
assert len(source["target"]) == len(source["native"]) == 7
assert len(archived["reader"]) == 7

card_holds = {
    6: "Source la protección is general protection; archived 墜落防止 means fall prevention. The Reader separately specifies fall protection. Keep the card's broader source sense until a qualified dictionary decision.",
}
reader_holds = {
    1: "Source says in construction; archived 建設現場では adds an explicit construction-site setting. Confirm whether that narrower setting is intended before selecting Japanese.",
    2: "Source says fall protection inspection; archived Japanese adds equipment. Confirm whether the inspection concerns equipment or the broader fall-protection program before selecting Japanese.",
    7: "Source asks the meaning of the Spanish word caída; archived Japanese asks about 転落 and archived English substitutes 'fall'. Decide whether the learner asks about the Spanish term, a Japanese term, or a translated fall term, keeping the source objective visible.",
}

cards = []
for n, ((es, en), draft) in enumerate(zip(words, archived["cards"]), 1):
    cards.append({
        "id": f"foundation-roofing:10:ja-en:card:{n}",
        "legacySourceRef": f"foundation-roofing:10:ja-en:cards:{n}",
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
        "id": f"foundation-roofing:10:ja-en:line:{n}",
        "legacySourceRef": f"foundation-roofing:10:ja-en:reader:{n}",
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
    "lessonId": "foundation-roofing:10:ja-en",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for name, path in FILES.items()},
    "sourceEnglishObjective": archived["sourceEnglishObjective"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "audioScript": None,
    "curriculumAdaptationNote": "Current source objective teaches Spanish-English cognates and asking for help. Japanese is not a cognate lesson; the archived kanji-compound objective is a proposed replacement that needs a qualified curriculum decision. Preserve the source 911 line without asserting a locale the source does not name; it is not a Japanese emergency-number claim. Keep accident, ambulance, inspection, fall protection and hospital meanings exact.",
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
    print("PASS Japanese Roofing Foundation 10 packet build --check")
else:
    path.write_text(output)
    print(path)
