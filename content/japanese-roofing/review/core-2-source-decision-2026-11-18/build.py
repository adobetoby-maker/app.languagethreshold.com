#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 2 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[2];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[2];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[1];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 2
assert archived["stableId"] == "roofing:2:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 14
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 7

card_holds = {
    1: "The source uses roof deck and later sheathing for related but potentially distinct assembly layers. Confirm that 屋根下地 identifies the intended deck, separately from card 5.",
    4: "水切り金物 can be a broad flashing term. Confirm the exact drip-edge profile and roof-edge sense with a roofing terminology reviewer.",
    5: "The source English sheathing and Spanish forro de techo overlap roof deck. Confirm the distinction from card 1 before fixing 下地板 as a dictionary answer.",
    7: "The source rake is a sloped gable edge. Confirm that けらば fits the intended roof geometry and locale.",
    9: "The source specifies synthetic underlayment. Confirm whether 合成ルーフィング communicates a synthetic material rather than a composite roof covering.",
    10: "The source instructs installing the drip edge first without qualifying edge or layer sequence. Roofing practice can depend on edge and assembly; obtain a qualified source/safety decision before teaching this as universal.",
    14: "The broad 水切り金物 candidate inherits card 4's exact drip-edge and edge-placement question.",
}
reader_holds = {
    1: "The source says shingles without specifying asphalt. Archived シングル材 has the same unresolved technical sense as Core 1.",
    4: "The source names underlayment as the layer on top, with felt paper as its example. The archived Japanese gives only a felt-roofing action and loses the explicit category/example distinction.",
    5: "The archived broad 水切り金物 question inherits card 4's drip-edge sense decision.",
    6: "Confirm 軒先 and けらば for eave edge and rake edge in the current roof geometry before selecting the technical Reader line.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:2:ja-en:card:{n}",
        "legacySourceRef": f"roofing:2:ja-en:cards:{n}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"],
        "sourceNoteSpanish": word.get("note"), "kind": word["kind"],
        "selectedJapanese": None,
        "candidateJapanese": None if n in card_holds else draft["ja"],
        "archivedJapanese": draft["ja"], "archivedEnglish": draft["en"],
        "reviewNote": card_holds.get(n), "reviewed": False,
    })

reader = []
for n, (es, en, draft) in enumerate(zip(passage["es"], passage["en"], archived["reader"]), 1):
    assert en == draft["en"]
    reader.append({
        "id": f"roofing:2:ja-en:line:{n}",
        "legacySourceRef": f"roofing:2:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:2:ja-en",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for name, path in FILES.items()},
    "sourceEnglishTitle": lesson["title"],
    "sourceEnglishObjective": lesson["objective"],
    "sourceEnglishSpeaking": lesson["speaking"],
    "sourceSpanishReaderTitle": passage["title"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "archivedForms": archived["forms"],
    "archivedSpeaking": archived["speaking"],
    "audioScript": None,
    "curriculumAdaptationNote": "Preserve the source deck, underlayment and edge sequence as provenance. Confirm roof deck versus sheathing, synthetic material, rake edge, drip-edge terminology and edge-dependent installation order with qualified Japanese and roofing reviewers before selecting learner answers. The archived draft is evidence only; this packet creates no lesson, score, audio or progress identity.",
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
    print("PASS Japanese Roofing Core 2 packet build --check")
else:
    path.write_text(output)
    print(path)
