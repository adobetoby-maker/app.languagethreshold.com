#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 18 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[18];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[18];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[17];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 18
assert archived["stableId"] == "roofing:18:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    2: "Source Teja asfáltica specifies asphalt shingle, while archived シングル材 is generic. Confirm the precise product/material sense before selecting a learner face.",
    12: "Lower air pressure is a source command, not a universal nail-gun correction. Confirm compressor/tool/product instructions, settings and who may adjust them with qualified roofing/tool review.",
    13: "Flush nail-head placement is a product-specific installation requirement. Confirm the approved shingle and manufacturer instructions before scoring this command.",
    14: "A new nail next to an overdriven nail is not a universal repair. Confirm the manufacturer's approved fastener location, spacing, replacement and damaged-shingle procedure.",
    15: "Adjust nail gun is a tool-specific safety command; identify approved adjustment and responsible operator before selecting Japanese imperative wording.",
}
reader_holds = {
    4: "Flush nail-head placement is product specific; preserve source but require approved manufacturer detail before learner selection.",
    6: "Lower air pressure cannot be treated as a universal repair. Confirm tool and compressor guidance before selecting a command.",
    7: "Adjust the nail gun needs product/tool-specific instructions and operator scope before learner selection.",
    8: "Adjacent replacement nail may violate placement or repair instructions; confirm approved detail and avoid universalizing source command.",
    9: "Tejas refers to the selected asphalt shingles. Archived シングル材 is generic; confirm product sense and testing sequence on representative shingles.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:18:ja-en:card:{n}",
        "legacySourceRef": f"roofing:18:ja-en:cards:{n}",
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
        "id": f"roofing:18:ja-en:line:{n}",
        "legacySourceRef": f"roofing:18:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:18:ja-en",
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
    "curriculumAdaptationNote": "Preserve the source sequence: foreman hears nail gun, notices overdriven nails, stops work, checks compressor and hose, gives lower-pressure and adjust-gun commands, proposes a nearby new nail, then checks depth on several shingles. These commands are source evidence, not approved universal repair or tool settings. Confirm the selected asphalt-shingle product, manufacturer instructions, nail-gun/compressor guidance, repair location and responsible operator before selecting Japanese instructions. Archived generic シングル材 needs product-specific review. Current source curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 18 packet build --check")
else:
    path.write_text(output)
    print(path)
