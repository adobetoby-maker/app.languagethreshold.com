#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 26 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[26];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[26];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[25];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 26
assert archived["stableId"] == "roofing:26:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 14
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    2: "Deck here is the structural roof deck, not the whole roof covering; archived 野地板 needs a contextual deck versus sheathing decision before a dictionary face is selected.",
    3: "Covered area means the area that will be covered after repair. Archived 覆われる範囲 may suggest an already covered zone; confirm timing and what remains visible in the record.",
    8: "Source distinguishes sheathing from deck in separate cards. Archived 下地板 may collapse them; qualified roofing/Japanese dictionary review must settle the product and structural senses.",
    10: "Photograph before covering is the source instruction. Confirm that the photo is a documentation step, not evidence by itself that the repair is technically adequate.",
    13: "Do not cover until I check it gives the foreman the check in this scene. Confirm inspection/authorization scope under the site process before scoring this construction instruction.",
}
reader_holds = {
    1: "Tear-off reveals a damaged deck section. Archived 野地板 is plausible but may narrow structural deck to one sheathing product; hold contextual material sense.",
    7: "The photo-before-cover instruction is source-authored. Keep it as documentation, separate from any approval of repair adequacy or permission to cover.",
    8: "The foreman says not to cover until he checks it; avoid converting this scene instruction into universal authorization or completed structural acceptance.",
    9: "The repair photo records what remains in the covered area. Archived Japanese may imply the photo itself demonstrates the hidden condition or repair adequacy; confirm record versus proof sense.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:26:ja-en:card:{n}",
        "legacySourceRef": f"roofing:26:ja-en:cards:{n}",
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
        "id": f"roofing:26:ja-en:line:{n}",
        "legacySourceRef": f"roofing:26:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:26:ja-en",
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
    "curriculumAdaptationNote": "Preserve the current source scene: during tear-off, the crew finds deck damage; the foreman requests the area, before/after photos and a size measurement; workers replace damaged plywood; a photo is taken before covering; the foreman checks before covering; the photo records what will be hidden. Deck and sheathing require separate contextual Japanese senses, and the photo is documentation rather than proof of structural adequacy. Archived speaking adds a measurement request beyond the source speaking objective. Current curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or saved-progress identity is created.",
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
    print("PASS Japanese Roofing Core 26 packet build --check")
else:
    path.write_text(output)
    print(path)
