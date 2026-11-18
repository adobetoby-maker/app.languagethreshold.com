#!/usr/bin/env python3
"""Build an inert, source-exact Japanese Roofing Foundation 3 review packet."""
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
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[24:36]
assert len(words) == 12
source = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["3"]["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
assert len(archived["cards"]) == 12 and len(archived["reader"]) == 7
assert len(source["target"]) == len(source["native"]) == 7
card_ambiguities = {
    6: "Source caliente means hot in more than one context; archived 暑いです means hot weather or air, while the Reader refers to a hot roof surface.",
    7: "Source frío is broad; archived 寒いです narrows to cold weather or felt cold, while the Reader describes the air as cold.",
    8: "Source el jefe is the boss; archived 班長 identifies a crew lead, a narrower role.",
}
line_ambiguities = {
    1: "Source identifies Pedro as crew boss; archived 班長 may be a narrower role and needs roofing job-role review.",
    7: "Source reports the harness is ready and safe; archived Japanese narrows to full-body harness and omits the safety claim.",
}
line_revisions = {
    5: "午後二時には屋根が熱いです。",
    6: "機材の準備はできていますか。",
}
cards = []
for n, ((es, en), draft) in enumerate(zip(words, archived["cards"]), 1):
    cards.append({
        "id": f"foundation-roofing:3:ja-en:card:{n}",
        "legacySourceRef": f"foundation-roofing:3:ja-en:cards:{n}",
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
        "id": f"foundation-roofing:3:ja-en:line:{n}",
        "legacySourceRef": f"foundation-roofing:3:ja-en:reader:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "candidateJapanese": None if n in line_ambiguities else line_revisions.get(n, draft["ja"]),
        "archivedJapanese": draft["ja"],
        "archivedEnglish": draft["en"],
        "reviewNote": line_ambiguities.get(n) or (
            "Source says the roof is hot at two, not that it becomes hot then; candidate removes the transition."
            if n == 5 else
            "Source asks about all equipment; candidate uses broader 機材 instead of archived 道具."
            if n == 6 else None
        ),
        "reviewed": False,
    })
assert set(archived["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
packet = {
    "schema": 1,
    "kind": "inert-source-review",
    "pair": {"target": "Japanese", "native": "English"},
    "stageId": "foundation-roofing",
    "lessonId": "foundation-roofing:3:ja-en",
    "source": {key: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for key, path in FILES.items()},
    "sourceEnglishObjective": archived["sourceEnglishObjective"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "curriculumAdaptationNote": "The source contrasts Spanish ser/estar. Japanese expresses identity, state and location differently; the target-language contrast needs qualified curriculum review.",
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
    print("PASS Japanese Roofing Foundation 3 packet build --check")
else:
    path.write_text(output)
    print(path)
