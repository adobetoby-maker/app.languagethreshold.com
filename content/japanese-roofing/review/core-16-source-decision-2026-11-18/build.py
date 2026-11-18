#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 16 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-16-18-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[16];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[16];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[15];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 16
assert archived["stableId"] == "roofing:16:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    1: "The source's nailing strip is a product-specific fastening area. Confirm that archived 釘打ち帯 identifies this area and stays distinct from sealant strip.",
    7: "Nailing zone is a product-specific fastening area; archived 釘打ち範囲 may be too broad without the manufacturer's shingle instructions.",
    8: "Source sealant strip / tira selladora may differ from archived 粘着帯 (adhesive band). Confirm the product feature and Japanese trade term.",
    10: "Source imperative 'Nail in the strip — not too high' needs the actual specified fastening zone; do not treat as a universal placement instruction.",
    12: "Source instruction to keep nails inside the nailing zone depends on the product specification. Confirm before selecting a Japanese imperative.",
    14: "Source 'Do it like this' accompanies a nail-gun demonstration but does not describe the method or safety controls. Hold any instructional implication.",
}
reader_holds = {
    2: "Outside-the-strip finding depends on the product's actual nailing strip position; confirm technical meaning.",
    5: "Inherits the card 12 product-specific nailing-zone instruction; confirm before selecting an imperative.",
    7: "Foreman takes a nail gun and says 'Do it like this' without a specified demonstration or safety controls. Preserve exact source, but do not select a procedural Japanese instruction.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:16:ja-en:card:{n}",
        "legacySourceRef": f"roofing:16:ja-en:cards:{n}",
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
        "id": f"roofing:16:ja-en:line:{n}",
        "legacySourceRef": f"roofing:16:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:16:ja-en",
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
    "curriculumAdaptationNote": "Preserve the current source sequence: the foreman checks the new asphalt-shingle course, sees a high nail outside the nailing strip, asks to see the strip, directs the crew to keep nails in the nailing zone and fix the row, takes a nail gun, and Pedro checks the nails afterward. The source shows a high nail outside the nailing strip and instructs a correction, but the exact fastening area is product-specific. The Reader depicts the foreman taking a nail gun and saying “Do it like this” without a specified demonstration or safety controls. Hold strip/zone terminology and any implied procedure for source/roofing review. Archived forms and six mode labels remain conditional evidence; the current curriculum has no authored verb-example list. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 16 packet build --check")
else:
    path.write_text(output)
    print(path)
