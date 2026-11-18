#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 12 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[12];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[12];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[11];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 12
assert archived["stableId"] == "roofing:12:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 14
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    3: "Roofing course / hilera means a row of asphalt shingles. Archived 段 can mean a generic step or tier; confirm Japanese trade wording.",
    4: "Source explicitly says asphalt shingle / teja asfáltica. Archived シングル材 is generic and omits asphalt; qualify the material term.",
    10: "The six-inch stagger is the guide's example, not the approved job setting. Archived 六インチずつ can imply a repeated exact increment; confirm the contextual phrasing before selection.",
    12: "Source asks for this job's stagger pattern or offset. Archived どれだけずらしますか asks only the amount; confirm whether that covers the job specification.",
    14: "The next roofing course is a shingle row. Archived 次の段 may be understood as a generic tier; hold with card 3.",
}
reader_holds = {
    1: "The source's first course is a row of asphalt shingles. Archived 最初の段 uses a generic tier; hold with card 3.",
    2: "Each new course means each new shingle row. Archived 各段 may be a generic stage; hold with card 3.",
    4: "The guide's six-inch stagger is illustrative. Archived 六インチずつ could be read as a repeated fixed increment; keep attribution and distinguish the actual job specification.",
    5: "Source says only that every job differs. Archived 現場ごとに仕様は異なります introduces 'specification'; plausible but not an exact Reader meaning. Confirm source adaptation.",
    6: "Source asks for this job's stagger. Archived どれだけずらしますか narrows the question to amount, potentially omitting the pattern/arrangement.",
    8: "The next course is a shingle row. Archived 次の段 can mean a generic tier; hold with card 3.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:12:ja-en:card:{n}",
        "legacySourceRef": f"roofing:12:ja-en:cards:{n}",
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
        "id": f"roofing:12:ja-en:line:{n}",
        "legacySourceRef": f"roofing:12:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:12:ja-en",
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
    "curriculumAdaptationNote": "Preserve the guide's six-inch stagger as an example, then ask the lead to confirm the actual job specification. The first course is asphalt shingles; each new course uses a pattern and joints must not align. Reader says the foreman phones the office while the crew checks the next course. Do not turn the example into a universal installation rule or replace the source's pattern question with only an offset amount. The current source has no authored verb-example list; archived forms and speaking are conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 12 packet build --check")
else:
    path.write_text(output)
    print(path)
