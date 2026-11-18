#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 6 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-4-6-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[6];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[6];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[5];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 6
assert archived["stableId"] == "roofing:6:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 16
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    1: "Crew lead / jefe de cuadrilla and foreman / capataz are distinct roles in this brief. Confirm 班長 against 職長 and company role hierarchy without promoting either as a universal job title.",
    2: "Área de acopio / staging area may be a designated material storage/staging area, while archived 資材仮置き場 narrows to temporary placement. Confirm site meaning and Japanese trade term.",
    3: "Desmontaje / tear-off includes removal of the existing roof in the source note; archived 既存屋根材の撤去 may narrow to roof materials rather than the whole old roof scope.",
    5: "Capataz / foreman must remain distinct from jefe de cuadrilla / crew lead. Confirm 職長 in this roofing crew hierarchy.",
    8: "Plan del techo / roof plan is today's crew/work plan; archived 屋根の施工計画 may imply only installation planning. Confirm scope.",
    9: "Peligro / hazard is any hazard, while archived 危険箇所 means a hazardous location. Confirm an inclusive Japanese term.",
    11: "Preserve the source's review of today's roof plan before work starts; do not imply this brief substitutes for the site safety plan or engineering approval.",
    13: "Source asks to show where materials will be staged, not necessarily stored temporarily; inherits staging-area term decision.",
    14: "Any hazard may include conditions, actions or equipment, not only a hazardous spot; archived 危険箇所 narrows meaning.",
}
reader_holds = {
    2: "Today's roof plan may cover assignments and staging, not merely roof installation; inherits card 8/11 scope decision.",
    3: "Tear-off crew scope and foreman/crew-lead hierarchy require consistent Japanese role/term decisions.",
    4: "Luis is the crew lead, distinct from the foreman; confirm 班長 role and register.",
    6: "Where materials will be staged is not necessarily a temporary storage location; inherits card 2/13 decision.",
    7: "Any hazard is broader than a hazardous spot; inherits card 9/14 decision.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:6:ja-en:card:{n}",
        "legacySourceRef": f"roofing:6:ja-en:cards:{n}",
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
        "id": f"roofing:6:ja-en:line:{n}",
        "legacySourceRef": f"roofing:6:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:6:ja-en",
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
    "curriculumAdaptationNote": "Preserve the 7:00 morning gathering, foreman question, Luis as crew lead, each person's assignment and work zone, material-staging location, any-hazard reporting, plan comprehension and questions before work. Keep crew lead and foreman distinct. The source does not establish universal job titles, temporary-only material storage or an approved safety/engineering plan. Archived forms and speaking remain unselected evidence. This packet creates no learner, audio, score or progress identity.",
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
    print("PASS Japanese Roofing Core 6 packet build --check")
else:
    path.write_text(output)
    print(path)
