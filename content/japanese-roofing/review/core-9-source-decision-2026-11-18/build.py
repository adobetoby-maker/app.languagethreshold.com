#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 9 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-7-9-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[9];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[9];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[8];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 9
assert archived["stableId"] == "roofing:9:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    4: "Escombros / debris includes rubble and removed material; archived 廃材 may imply only discard materials. Confirm inclusive Japanese site-cleanup term.",
    7: "Carretilla / wheelbarrow is more specific than generic 手押し車 (handcart). Confirm equipment term for a wheelbarrow.",
    10: "Source English says shingles and Spanish tejas is material-dependent. Archived シングル材 may imply asphalt shingles; confirm the roof product before choosing the Japanese trade term.",
    12: "Cubierta / deck is the roof deck, while 屋根下地 can mean substrate; ルーフィング often means roofing felt rather than generic underlayment. Confirm both scope and installation sequence.",
    13: "Magnetic nail sweep is a process, not proof of complete nail removal. Archived 磁石での釘拾い may omit the sweep action; confirm procedure wording.",
    14: "Shingle pieces inherit card 10's material-specific Japanese term decision.",
}
reader_holds = {
    1: "Debris after tear-off inherits card 4's rubble/material distinction; do not narrow to only discard material.",
    3: "Shingles in the debris dumpster inherit card 10's material-specific roofing term decision.",
    4: "Wheelbarrow must remain distinct from a generic handcart; inherits card 7.",
    7: "Roof deck/underlayment terms and sequence inherit card 12; archived ルーフィング may narrow generic underlayment.",
    8: "Finish picking up nails with a magnet does not establish verified zero nails or safety clearance; preserve the exact reporting instruction.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:9:ja-en:card:{n}",
        "legacySourceRef": f"roofing:9:ja-en:cards:{n}",
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
        "id": f"roofing:9:ja-en:line:{n}",
        "legacySourceRef": f"roofing:9:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:9:ja-en",
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
    "curriculumAdaptationNote": "Preserve after-tear-off debris, gloves, shingles into a debris dumpster, shovel and wheelbarrow split, pulling old nails, magnet over the yard, deck sweep before underlayment and reporting after magnetic nail pickup. Avoid turning the magnet pass into a guarantee that no nails remain. Confirm shingle material, wheelbarrow, debris, deck and underlayment senses before selecting Japanese learner text. Archived forms and speaking remain evidence only; this packet creates no learner, audio, score or progress identity.",
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
    print("PASS Japanese Roofing Core 9 packet build --check")
else:
    path.write_text(output)
    print(path)
