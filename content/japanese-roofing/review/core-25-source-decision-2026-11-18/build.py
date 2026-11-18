#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 25 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-24-26-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[25];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[25];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[24];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 25
assert archived["stableId"] == "roofing:25:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    3: "Exclusion area is an established boundary around falling-debris work. Archived 立入禁止区域 implies a full entry ban; confirm the site-zone sense and marking before selecting a scored term.",
    5: "Warning tape is an unspecified site control in the source. Confirm 警告テープ and the site-specific warning/marking sense, without inventing a particular tape specification.",
    7: "Chute means debris chute in this source. Confirm 廃材用シュート against the actual debris-control equipment and usage before a site instruction.",
    8: "Source cone is generic; archived カラーコーン specifies a colored cone. Remove the added attribute or confirm source intent.",
    9: "Tear-off / desmontaje may cover more than 既存屋根材の撤去. Confirm the removal scope against source objective and site work sequence.",
    13: "Wait until I say it's clear names speaker authority and an all-clear. Archived 安全を確認したと言う adds a safety-verification claim; settle who may release the exclusion area and exact all-clear wording.",
    15: "Heads up! Debris coming down! is an immediate warning. Archived 廃材が落ちます sounds future or generic; confirm immediate hazard wording and audience below.",
}
reader_holds = {
    1: "Source tear-off scope is broad; archived 既存屋根材の撤去 may narrow it to covering removal. Confirm site task and foreman role.",
    3: "Warning tape around the exclusion area is a source scene instruction. Confirm Japanese boundary and tape terms against the site control before scored deployment.",
    7: "Source conditions the debris-chute use and requires warning people first. Archived warning uses a future/generic 落ちます; preserve immediate hazard timing and equipment context.",
    8: "Wait until I say it's clear requires an explicit all-clear from the source speaker. Archived 安全を確認した adds verification not stated; settle speaker authority and release phrase.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:25:ja-en:card:{n}",
        "legacySourceRef": f"roofing:25:ja-en:cards:{n}",
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
        "id": f"roofing:25:ja-en:line:{n}",
        "legacySourceRef": f"roofing:25:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:25:ja-en",
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
    "curriculumAdaptationNote": "Preserve the source scene in order: before tear-off resumes, the foreman addresses the ground crew; falling debris can injure people below; warning tape marks the exclusion area; workers move away and do not stand below even with hard hats; if a debris chute is used, warn people first with an immediate heads-up; then wait for the source speaker's all-clear. Archived Japanese narrows tear-off, adds cone color and safety-verification claims, and softens the immediate warning. Product/site boundary and release authority need qualified review. Current curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 25 packet build --check")
else:
    path.write_text(output)
    print(path)
