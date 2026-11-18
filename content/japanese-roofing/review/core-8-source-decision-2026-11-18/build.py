#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 8 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[8];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[8];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[7];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 8
assert archived["stableId"] == "roofing:8:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    1: "Archived 野地板 may narrow sheathing/forro de techo to structural roof boards. Confirm the roof assembly and Japanese trade term before selection.",
    2: "The Spanish source says soft or rotten deck; archived 柔らかくなった屋根下地 may omit the rotten condition and may refer to underlayment rather than the structural deck.",
    7: "Panel is archived as 板材 (board/material); confirm whether this preserves a deck panel rather than a loose board.",
    10: "Inherits card 1's unresolved sheathing/野地板 scope for the no-damage instruction.",
    11: "The source asks workers to report if the deck feels soft or damaged. Confirm 屋根下地 identifies the structural deck and preserves the condition, not a generic layer.",
    12: "The deck must be repaired before work continues. Confirm the precise structural-deck sense and hold the stop-work sequence.",
    13: "The source bars covering the soft panel. Archived 板材 may weaken the deck-panel meaning; confirm the material before selecting a learner instruction.",
}
reader_holds = {
    2: "Inherits card 10's sheathing/野地板 scope question.",
    3: "Inherits card 11's structural deck and soft/damaged condition question.",
    4: "Source says a worker steps on a panel and feels that the wood is rotten. Archived 気づきます changes sensory discovery to noticing and needs Japanese/source review.",
    5: "Inherits card 12's stop-work and structural-deck repair requirement.",
    6: "Inherits card 13's soft deck-panel meaning; do not turn this into a generic covering instruction.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:8:ja-en:card:{n}",
        "legacySourceRef": f"roofing:8:ja-en:cards:{n}",
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
        "id": f"roofing:8:ja-en:line:{n}",
        "legacySourceRef": f"roofing:8:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:8:ja-en",
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
    "curriculumAdaptationNote": "Preserve the current tear-off scene: prevent sheathing damage, report soft or damaged structural deck, discover rotten wood by stepping on a panel, stop before covering, mark damage and replace plywood. Do not turn a soft structural panel into generic soft material or change felt rot to a visual guess. The source curriculum has no authored verb example list; archived forms remain conditional evidence. Archived draft is not selected learner/audio text and creates no score, saved-item or progress identity.",
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
    print("PASS Japanese Roofing Core 8 packet build --check")
else:
    path.write_text(output)
    print(path)
