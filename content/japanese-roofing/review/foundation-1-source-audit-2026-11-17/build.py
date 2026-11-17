#!/usr/bin/env python3
"""Build an inert, source-exact Japanese Roofing Foundation 1 review packet."""
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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/foundation-1-3-draft.json",
}
curriculum = (ROOT / FILES["curriculum"]).read_text()
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[:12]
assert len(words) == 12
source = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["1"]["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
assert len(archived["cards"]) == 12 and len(archived["reader"]) == 7
assert len(source["target"]) == len(source["native"]) == 7
card_ambiguities = {
    2: "Source teja spans shingle and roof tile; シングル材 only names shingle material.",
    7: "Source arnés is generic; フルハーネス names a full-body harness.",
}
line_ambiguities = {
    3: "Source arnés is generic; the archived Japanese specifies a full-body harness.",
    4: "Source teja can name shingle or roof tile; the archived Japanese selects shingle material.",
}
cards = []
for n, ((es, en), draft) in enumerate(zip(words, archived["cards"]), 1):
    cards.append({
        "id": f"foundation-roofing:1:ja-en:card:{n}",
        "legacySourceRef": f"foundation-roofing:1:ja-en:cards:{n}",
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
        "id": f"foundation-roofing:1:ja-en:line:{n}",
        "legacySourceRef": f"foundation-roofing:1:ja-en:reader:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "candidateJapanese": None if n in line_ambiguities else (
            "同僚はとても速く話します。" if n == 6 else draft["ja"]
        ),
        "archivedJapanese": draft["ja"],
        "archivedEnglish": draft["en"],
        "reviewNote": line_ambiguities.get(n) or (
            "Corrects the archived cannot-keep-up sentence to the source coworker-speaks-fast meaning; needs fluent review."
            if n == 6 else
            "Adapts the source's in-Spanish question to Japanese-target instruction; preserve the source as provenance."
            if n == 5 else None
        ),
        "reviewed": False,
    })
assert set(archived["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
packet = {
    "schema": 1,
    "kind": "inert-source-review",
    "pair": {"target": "Japanese", "native": "English"},
    "stageId": "foundation-roofing",
    "lessonId": "foundation-roofing:1:ja-en",
    "source": {key: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for key, path in FILES.items()},
    "sourceEnglishObjective": archived["sourceEnglishObjective"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "curriculumAdaptationNote": "Spanish-vowel objective is provenance; Japanese pronunciation and crew greeting need a qualified target-language objective decision.",
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
    assert path.read_text() == output, "packet drifted from pinned source/archived draft"
    print("PASS Japanese Roofing Foundation 1 packet build --check")
else:
    path.write_text(output)
    print(path)
