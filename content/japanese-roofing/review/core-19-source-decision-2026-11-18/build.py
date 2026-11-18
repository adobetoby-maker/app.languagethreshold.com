#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 19 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[19];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[19];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[18];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 19
assert archived["stableId"] == "roofing:19:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 14
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    1: "Confirm 段差水切り denotes discrete step-flashing pieces at the roof-to-wall joint, not generic flashing or drip edge; pair with the source's wall detail.",
    3: "Source shingle course / hilera de tejas is one installed row. Archived シングル材の段 may read as material stage; settle trade term and shingle material scope.",
    4: "Source sidewall / pared lateral names the wall where roof and wall meet. Archived 外壁際 means the area beside the exterior wall; confirm whether this row should name the wall or location.",
    5: "Source flashing is generic here, while step flashing is specific in card 1. Confirm 水切り板金 and 段差水切り senses and dictionary disambiguation.",
    10: "Source is a fragment, 'Step flashing under each shingle course.' Archived Japanese turns it into a scored imperative and adds put/place. Preserve fragment versus command until source objective and approved detail are settled.",
    11: "One piece per course is a source instruction within this wall detail, not a universal product rule. Confirm actual step-flashing piece and course sequence before scored command.",
    12: "Bending flashing against the wall is product/detail-specific and may conflict with the approved wall interface; hold this installation command for qualified roofing/manufacturer review.",
    13: "Archived 外壁際 refers to location whereas source sidewall can name wall; coordinate with card 4 before scored sequence prompt.",
    14: "How flashing overlaps depends on the approved wall/roof detail; retain the source as a request to show, not a prescribed overlap geometry.",
}
reader_holds = {
    1: "Source says crew works on the sidewall, not merely nearby; coordinate the sidewall/location distinction with cards 4 and 13.",
    3: "The foreman asks installers to describe the sidewall flashing sequence. Archived Japanese uses one installer/担当者 later; keep speaker number and addressee coherent.",
    4: "Source answer is a fragment about step flashing under each course. Archived Japanese is a declarative answer; confirm sidewall detail and distinguish from card 10's added imperative.",
    5: "One step-flashing piece per course is a product/detail-specific installation instruction; qualify before learner-facing scored text or audio.",
    6: "Bending flashing against the wall is a technical command requiring approved wall/roof product detail and manufacturer review.",
    7: "Overlap geometry is not supplied by source; keep a request to show how pieces overlap rather than imply a generic approved pattern.",
    8: "The foreman checks each piece before the next shingle course. Coordinate actual course terminology, sequence and step-flashing inspection scope.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:19:ja-en:card:{n}",
        "legacySourceRef": f"roofing:19:ja-en:cards:{n}",
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
        "id": f"roofing:19:ja-en:line:{n}",
        "legacySourceRef": f"roofing:19:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:19:ja-en",
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
    "curriculumAdaptationNote": "Preserve the current source sequence: crew at the sidewall; roof meets wall; foreman asks installers for step-flashing sequence; installers state step flashing under each shingle course; source then gives one piece per course, bending against wall and showing overlap; foreman checks each piece before placing the next course. Source does not identify a product, wall assembly or overlap geometry, so implementation commands need qualified roofing/manufacturer review. Archived Japanese changes the source card-10 fragment into an imperative, and its sidewall/location and shingle-course terms need review. Current curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 19 packet build --check")
else:
    path.write_text(output)
    print(path)
