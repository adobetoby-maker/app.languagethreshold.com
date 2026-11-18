#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 20 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-19-20-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[20];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[20];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[19];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 20
assert archived["stableId"] == "roofing:20:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 14
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    1: "Ridge cap names a finish component, while archived 棟包み材 may name a material or assembly. Confirm the chosen product's Japanese trade term and dictionary sense.",
    2: "The source starter shingle may be a distinct product from the selected ridge cap. Archived スターターシングル材 implies a material without checking the approved cap-cutting method.",
    3: "Ridge is the roof line here; archived 棟 can also mean a ridge assembly. Confirm context with ridge cap and ridge vent.",
    4: "Hip / limatesa is a sloping roof intersection; confirm archived 隅棟 names the intended line rather than an installed cap.",
    5: "Ridge vent is a ventilation component at the ridge. Confirm archived 棟換気材 versus product/assembly term and its relationship to cap installation.",
    7: "Source finish / acabado is a noun, but archived 仕上げる is a verb. Reauthor noun sense before any card selection.",
    10: "The source card commands cutting ridge caps from a starter shingle without a product condition, while Reader 4 adds 'if the product allows it'. Hold the isolated instruction until source/product scope is resolved.",
    11: "Installing caps along the ridge depends on the selected ridge-cap product and ridge-vent assembly; do not select a generic construction command before product review.",
    12: "The source requires checking the product instructions for the ridge cap. Confirm that archived 製品説明書 identifies the chosen product and preserves this prerequisite.",
    13: "Sealing the last cap is presented as an unconditional instruction, but the selected product's fastening/sealant method must govern; hold the directive for qualified roofing review.",
}
reader_holds = {
    2: "English says the ridge and hip are still missing; archived Japanese says their installation remains. The source likely means unfinished work, but confirm the exact roof state and preserve the source meaning.",
    3: "Product instructions precede any cutting or installation; confirm which ridge-cap product and vent assembly the instruction covers.",
    4: "Reader explicitly conditions cutting caps from a starter shingle on product permission; card 10 omits that condition. Hold both until source/product scope is aligned.",
    5: "Ridge-cap installation along the ridge is product and ridge-vent dependent. Do not present one generic fastening sequence as an approved method.",
    6: "Foreman checks ridge vent; confirm archived 棟換気材 identifies the component and does not imply ventilation performance approval.",
    7: "Sealing the last cap may not apply to every chosen product. Preserve source attribution but hold a learner-facing construction command until roofing review.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:20:ja-en:card:{n}",
        "legacySourceRef": f"roofing:20:ja-en:cards:{n}",
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
        "id": f"roofing:20:ja-en:line:{n}",
        "legacySourceRef": f"roofing:20:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:20:ja-en",
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
    "curriculumAdaptationNote": "Preserve the source sequence: the crew has ridge and hip finish work left; first check the selected ridge-cap product instructions; cut caps from a starter shingle only if the product permits; install caps along the ridge; the foreman checks the ridge vent; seal the final cap and clean up. The isolated source card 10 lacks Reader 4's product condition, and the last-cap sealant method is product-specific. Archived Japanese noun/verb and roof-component senses require qualified Japanese/roofing/dictionary review. Current curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 20 packet build --check")
else:
    path.write_text(output)
    print(path)
