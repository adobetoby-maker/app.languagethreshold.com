#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 1 source comparison."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
FILES = {
    "curriculum": "src/data/roofing-curriculum.ts",
    "words": "src/data/roofing-lesson-words.ts",
    "passage": "src/data/roofing-lesson-passages.ts",
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-1-3-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[1];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[1];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[0];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""
source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == 1 and len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8
assert archived["stableId"] == "roofing:1:ja-en"
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]

card_holds = {
    1: "Source Spanish explicitly says asphalt shingle; archived シングル材 and English 'shingle' omit asphalt. Confirm the Japanese sense and source's broader English label.",
    2: "Source Spanish specifies clay/concrete tile; archived 屋根瓦 and English 'tile' omit those materials. A roofing dictionary reviewer must choose the intended sense.",
    4: "Source 'roof deck' has two Spanish alternatives (cubierta / forro de techo). Confirm whether 屋根下地 preserves the intended structural component.",
    6: "Source 'roof system' may mean the assembled system; archived 屋根構成 means roof composition. Confirm technical equivalence.",
    11: "Source asks what material this roof has; archived Japanese asks what material people use on this roof. Decide whether to preserve the source's possession question or teach the use question.",
    13: "Source identifies the roof as metal panel material; archived Japanese identifies the entire roof as a metal panel. Confirm roofing phrasing.",
}
reader_holds = {
    2: "Source says the foreman walks the roof; archived Japanese says the foreman looks around the roof with workers. Confirm safety and action meaning before selecting.",
    4: "Source says it is a roof system with asphalt shingles; archived Japanese says asphalt shingles are used in the roof composition. Confirm equivalence.",
    5: "Source asks what material the roof has; archived Japanese asks what material is used. Coordinate with card 11.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:1:ja-en:card:{n}",
        "legacySourceRef": f"roofing:1:ja-en:cards:{n}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
        "selectedJapanese": None,
        "candidateJapanese": None if n in card_holds else draft["ja"],
        "archivedJapanese": draft["ja"], "archivedEnglish": draft["en"],
        "reviewNote": card_holds.get(n), "reviewed": False,
    })

reader = []
for n, (es, en, draft) in enumerate(zip(passage["es"], passage["en"], archived["reader"]), 1):
    assert en == draft["en"]
    reader.append({
        "id": f"roofing:1:ja-en:line:{n}",
        "legacySourceRef": f"roofing:1:ja-en:reader:{n}",
        "sourceSpanish": es, "sourceEnglish": en,
        "selectedJapanese": None,
        "candidateJapanese": None if n in reader_holds else draft["ja"],
        "archivedJapanese": draft["ja"], "archivedEnglish": draft["en"],
        "reviewNote": reader_holds.get(n), "reviewed": False,
    })

assert set(archived["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
packet = {
    "schema": 1, "kind": "inert-source-review",
    "pair": {"target": "Japanese", "native": "English"},
    "stageId": "roofing", "lessonId": "roofing:1:ja-en",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for name, path in FILES.items()},
    "sourceEnglishTitle": lesson["title"],
    "sourceEnglishObjective": lesson["objective"],
    "sourceEnglishSpeaking": lesson["speaking"],
    "sourceSpanishReaderTitle": passage["title"],
    "candidateObjective": archived["objective"], "candidateFocus": archived["focus"],
    "audioScript": None,
    "curriculumAdaptationNote": "Pin the Spanish/English roof-system lesson exactly. Japanese roof-system, shingle, tile and deck terms need qualified technical and dictionary review. The archived Reader changes 'walks the roof' to 'looks around the roof'; keep the source action visible and obtain a roofing safety decision. This packet is review evidence only and creates no learner course, audio, score or progress identity.",
    "cards": cards, "reader": reader,
    "archivedModeLabels": {mode: {"label": label, "authoredPromptTargetPair": False, "readyForLearner": False}
                           for mode, label in archived["modes"].items()},
    "reviewGates": {key: False for key in ["qualifiedJapanese", "qualifiedRoofing", "dictionarySenses",
                                             "sourceDecision", "audioListening", "learnerRuntime", "scoring",
                                             "offline", "savedProgress", "browserAcceptance", "v4Acceptance"]},
    "reviewed": False, "registered": False, "audioRegistered": False,
}
output = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
path = HERE / "packet.json"
if "--check" in sys.argv:
    assert path.read_text() == output, "packet drifted from current source or archived draft"
    print("PASS Japanese Roofing Core 1 packet build --check")
else:
    path.write_text(output)
    print(path)
