#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 14 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-13-15-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[14];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[14];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[13];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 14
assert archived["stableId"] == "roofing:14:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 14
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    1: "Source underlayment / sub-capa is generic, while archived ルーフィング may narrow to asphalt roofing felt. Confirm the product class before selecting a trade term.",
    5: "Felt paper / papel de fieltro is a material category. Archived アスファルトフェルト specifies asphalt felt; confirm material before selecting this narrower face.",
    6: "Plastic cap nails / clavos con tapa plástica should not imply a specific resin product. Confirm 樹脂キャップ付き釘 against the job's fastener specification.",
    10: "The source gives a six-inch example attributed to the guide and asks for selected-product verification. Archived declarative 'is six inches' may teach it as a universal installation rule.",
    11: "Inherits card 1's underlayment material class. Preserve roll-out action without fixing the product to bituminous roofing felt.",
    14: "Inherits cards 1 and 6: product class and plastic-cap fastener wording require source/trade review.",
}
reader_holds = {
    1: "Deck / cubierta names the roof deck; archived 屋根下地 may be understood as generic substrate or sheathing. Confirm structural-deck sense.",
    2: "Inherits card 1's generic underlayment versus narrower ルーフィング material question.",
    3: "Inherits card 1's generic underlayment versus narrower ルーフィング material question.",
    5: "Preserve the foreman's attribution of the six-inch example to the guide and separate it from the selected manufacturer's required overlap; also inherits the underlayment material hold.",
    9: "Inherits cards 1 and 6: generic underlayment and specified plastic-cap fastener. Do not turn an example into a universal fastener/material rule.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:14:ja-en:card:{n}",
        "legacySourceRef": f"roofing:14:ja-en:cards:{n}",
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
        "id": f"roofing:14:ja-en:line:{n}",
        "legacySourceRef": f"roofing:14:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:14:ja-en",
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
    "curriculumAdaptationNote": "Preserve the current source sequence: yesterday the crew cleaned the deck, today it rolls out underlayment straight without wrinkles, the foreman recalls a guide's six-inch example and verifies the selected manufacturer's instructions, a worker remeasures the overlap, then the crew fastens with plastic-cap nails. Six inches is not a universal specification. Archived Japanese may narrow generic underlayment/felt and fasteners to asphalt/resin products; hold those faces for qualified source/roofing review. Current curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
    "sourceVerbExamples": None,
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
    print("PASS Japanese Roofing Core 14 packet build --check")
else:
    path.write_text(output)
    print(path)
