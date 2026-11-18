#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 28 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-27-30-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[28];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[28];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[27];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 28
assert archived["stableId"] == "roofing:28:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 16
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    2: "Source dumpster / contenedor de escombros is a debris container. Confirm 廃材コンテナ against the site's actual waste stream and avoid assuming every trash item belongs in it.",
    7: "Source debris / escombros can include construction waste beyond reusable or discarded building material. Archived 廃材 may narrow the sense; confirm contextual dictionary entry.",
    8: "Yard / patio is the exterior space around this house. Archived 庭 may imply garden rather than the work area; confirm site/location sense.",
    12: "Magnetic nail sweep denotes a systematic cleanup pass, not just picking up nails with a magnet. Archived 磁石での釘拾い may lose sweep coverage and completion meaning.",
    14: "Pick up every nail is the direct source command. Confirm how the absolute cleanup target is expressed without implying an unverified completed sweep.",
    15: "Source asks if the dumpster is full. Archived 廃材コンテナ narrows container and waste-stream sense; align with card 2 and Reader 8.",
    16: "Leave the yard cleaner than you found it refers to the source's exterior work area. Archived 庭を作業前よりきれいにして帰る adds before-work comparison; confirm reference and site scope.",
}
reader_holds = {
    3: "Source nails and debris in gutters; archived 廃材 may narrow debris. Align with card 7 and gutter/downspout maintenance scope.",
    8: "Source directs putting trash in the dumpster. Archived 廃材コンテナ implies a particular debris-only waste stream; confirm site disposal rule before scoring an instruction.",
    9: "Source compares the yard to its found condition. Archived 庭 and 作業前 may narrow the exterior location and add a work-start baseline.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:28:ja-en:card:{n}",
        "legacySourceRef": f"roofing:28:ja-en:cards:{n}",
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
        "id": f"roofing:28:ja-en:line:{n}",
        "legacySourceRef": f"roofing:28:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:28:ja-en",
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
    "curriculumAdaptationNote": "Preserve the source sequence: finished roof still needs cleanup; foreman assigns gutter and site check; nails and debris in gutters can obstruct the downspout; crew picks up nails around the house, reports when the magnetic nail sweep is finished, checks dumpster fullness, sweeps the yard and disposes of trash, then leaves the exterior area cleaner than found. Archived Japanese may narrow yard/patio to garden and debris/dumpster to building material, and may lose the systematic sweep sense. Confirm site waste stream and cleanup verification before scored commands. Current curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 28 packet build --check")
else:
    path.write_text(output)
    print(path)
