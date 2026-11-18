#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 11 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-10-12-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[11];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[11];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[10];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 11
assert archived["stableId"] == "roofing:11:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 13
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    1: "Source specifies a chalk line (línea de tiza). Archived 墨線 is an ink line; confirm Japanese chalk-line terminology and avoid changing the layout medium.",
    2: "First course / primera hilera is the first shingle row; archived 最初の段 may mean a generic stage or tier. Confirm trade wording.",
    3: "Source pairs starter strip with hilera inicial (starter row). Archived スターター材 names a material; confirm whether a manufactured strip or installed starter course is intended.",
    8: "Overhang / vuelo del alero is a plan measurement. Archived 軒先の出幅 may mean the eave's building projection rather than the starter/shingle overhang; source/trade decision needed.",
    9: "Inherits card 1 chalk-versus-ink and card 2 first-course meaning; do not select a layout instruction until both are resolved.",
    13: "Inherits card 3 starter-strip-versus-starter-course question. Preserve placement along the eave without adding an installation specification.",
}
reader_holds = {
    2: "Current English says the foreman marks points on the plan after measuring from the eave; source Spanish can mean plan points. Confirm whether the plan or roof surface receives marks before teaching the action.",
    3: "Inherits card 9 chalk-line medium and first-course wording questions.",
    4: "Source says workers stretch and snap the line. Archived 墨つぼの糸 specifies an ink snap line, which conflicts with source chalk/tiza.",
    8: "Inherits card 13 starter-strip-versus-starter-course decision.",
    9: "The source's overhang measurement is on the job plan; archived 軒先の出幅 may refer to the building eave projection rather than specified shingle/starter overhang.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:11:ja-en:card:{n}",
        "legacySourceRef": f"roofing:11:ja-en:cards:{n}",
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
        "id": f"roofing:11:ja-en:line:{n}",
        "legacySourceRef": f"roofing:11:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:11:ja-en",
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
    "curriculumAdaptationNote": "Preserve the current first-course layout: tape measure from the eave edge, points associated with the plan, a chalk line for the first shingle row, two workers stretching/snapping it, a straightness check, starter placement along the eave, and the specified overhang measurement on the job plan. Source English/Spanish have a plan-point ambiguity; hold it for source/roofing review. Archived ink-line, generic tier, material strip and eave-projection senses are conditional only. The source curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 11 packet build --check")
else:
    path.write_text(output)
    print(path)
