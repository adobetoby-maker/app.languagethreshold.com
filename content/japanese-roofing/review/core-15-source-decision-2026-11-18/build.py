#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 15 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-13-15-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[15];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[15];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[14];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 15
assert archived["stableId"] == "roofing:15:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    1: "Roof valley / limahoya is a specific roof junction. Qualify archived 谷部 as trade Japanese before selection.",
    2: "Ice and water shield is the source's membrane term, while Spanish says waterproof membrane. Archived 氷・水浸入防止シート is a literal rendering; verify trade usage and whether product specificity is intended.",
    7: "Source leak / gotera also notes filtración. Archived 雨漏り narrows to rainwater leak; confirm the intended roof-water sense and dictionary treatment.",
    9: "Source explicitly says asphalt shingle / teja asfáltica. Archived シングル材 omits asphalt; qualify the material term.",
    10: "The installation direction is up/along the valley using ice and water shield. Qualify archived literal product term and 谷部に沿って for the source action.",
    11: "Source requests showing the valley protection before it is covered. Archived 防水施工 says waterproofing work; confirm that the protection layer and inspection timing stay explicit.",
    15: "Source asks whether the valley is covered all the way. Archived 端まで may imply only reaching an edge; confirm full continuous coverage meaning.",
}
reader_holds = {
    5: "Source specifies ice and water shield up the valley. Qualify archived literal product term and installation direction with card 10.",
    8: "Source asks whether the valley is covered all the way. Archived 端まで may imply only reaching an edge; hold with card 15.",
    9: "Source requests showing valley protection before covering it. Archived 防水施工 may narrow protection to waterproofing work; hold with card 11.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:15:ja-en:card:{n}",
        "legacySourceRef": f"roofing:15:ja-en:cards:{n}",
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
        "id": f"roofing:15:ja-en:line:{n}",
        "legacySourceRef": f"roofing:15:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:15:ja-en",
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
    "curriculumAdaptationNote": "Preserve the source sequence: water runs forcefully through the roof valley, so the crew cuts the membrane, removes adhesive backing, runs ice and water shield up the valley, presses it flat against the roof deck and asks to inspect full valley protection before it is covered. Do not turn the lesson into a universal installation specification or introduce dimensions, approved products, substitute membranes or unqualified waterproofing claims. The source has no authored verb-example list; archived forms and speaking are conditional evidence, including an archived put/place versus add lexical mismatch. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 15 packet build --check")
else:
    path.write_text(output)
    print(path)
