#!/usr/bin/env python3
"""Build an inert, source-exact Japanese Roofing Foundation 2 review packet."""
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
words = re.findall(r'^\s*[tp]\("([^"]+)", "([^"]+)"', curriculum, re.M)[12:24]
assert len(words) == 12
source = json.loads((ROOT / FILES["reader"]).read_text())["lessons"]["2"]["passage"]
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
assert len(archived["cards"]) == 12 and len(archived["reader"]) == 8
assert len(source["target"]) == len(source["native"]) == 8
card_ambiguities = {
    2: "Source la hora includes clock time and an hour; archived 時間 alone does not teach the clock-time sense clearly.",
    6: "Source el bulto is a bundle of shingles; archived 一束 adds the quantity one and needs a contextual term decision.",
}
card_revisions = {9: "何束ですか。", 11: "長さは十フィートです。"}
line_revisions = {
    3: "今日は何束必要ですか。",
    4: "シングル材が三十束必要です。",
    5: "一束の重さは約七十ポンドです。",
    8: "数と時刻を手元の紙に書き留めます。",
}
line_notes = {
    3: "Archived Japanese specifies shingles before the source question does; candidate preserves source order.",
    4: "Archived Japanese omits the source's shingles; candidate restores them. Confirm シングル材 with a roofing reviewer.",
    5: "Candidate states the source's weighs relationship explicitly; validate weight phrasing.",
    8: "Candidate restores clock time, writing down, and a paper at hand; validate natural Japanese.",
}
cards = []
for n, ((es, en), draft) in enumerate(zip(words, archived["cards"]), 1):
    cards.append({
        "id": f"foundation-roofing:2:ja-en:card:{n}",
        "legacySourceRef": f"foundation-roofing:2:ja-en:cards:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "candidateJapanese": None if n in card_ambiguities else card_revisions.get(n, draft["ja"]),
        "archivedJapanese": draft["ja"],
        "archivedEnglish": draft["en"],
        "reviewNote": card_ambiguities.get(n) or (
            "Candidate removes the archived need clause absent from the source's quantity question."
            if n == 9 else "Candidate states the measurement relation explicitly." if n == 11 else None),
        "reviewed": False,
    })
reader = []
for n, (es, en, draft) in enumerate(zip(source["target"], source["native"], archived["reader"]), 1):
    reader.append({
        "id": f"foundation-roofing:2:ja-en:line:{n}",
        "legacySourceRef": f"foundation-roofing:2:ja-en:reader:{n}",
        "sourceSpanish": es,
        "sourceEnglish": en,
        "candidateJapanese": line_revisions.get(n, draft["ja"]),
        "archivedJapanese": draft["ja"],
        "archivedEnglish": draft["en"],
        "reviewNote": line_notes.get(n),
        "reviewed": False,
    })
assert set(archived["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
packet = {
    "schema": 1,
    "kind": "inert-source-review",
    "pair": {"target": "Japanese", "native": "English"},
    "stageId": "foundation-roofing",
    "lessonId": "foundation-roofing:2:ja-en",
    "source": {key: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for key, path in FILES.items()},
    "sourceEnglishObjective": archived["sourceEnglishObjective"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "curriculumAdaptationNote": "The Spanish source teaches numbers, clock time and U.S. units; the Japanese candidate uses Japanese counters and loanwords. Confirm unit, quantity and clock-time senses in context.",
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
    print("PASS Japanese Roofing Foundation 2 packet build --check")
else:
    path.write_text(output)
    print(path)
