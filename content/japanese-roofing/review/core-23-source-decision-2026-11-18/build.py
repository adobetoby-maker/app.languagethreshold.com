#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 23 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-21-23-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[23];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[23];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[22];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 23
assert archived["stableId"] == "roofing:23:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    2: "Footing / apoyo firme al pisar is secure placement and traction while stepping, not merely 足元の安定 as an abstract state. Confirm a natural Japanese term and the roof-work safety context.",
    3: "雷 may denote thunder or lightning; source specifically means electrical lightning hazard. Confirm Japanese term and timing with qualified safety/Japanese review.",
    9: "Boots / botas is footwear type, while archived 作業靴 covers work shoes broadly. Keep boot sense and grip-property claims distinct.",
    11: "The source prohibits roof work in lightning. Archived 雷が発生している間 can read as only while lightning is actively occurring; settle onset/approach and safe-stop timing before scoring.",
    12: "Source says stop work and come down if weather changes. This broadly worded trigger needs qualified roofing/weather safety context; archived Japanese should not imply every harmless change or wait past lightning approach.",
    14: "Source commands immediate descent for an approaching storm. Confirm timing, roof-exit sequence and lightning approach consistency with the speaking objective; do not treat isolated sentence as a complete emergency procedure.",
    15: "Source specifies boots with good grip. Archived 滑りにくい作業靴 loses boots; qualified reviewer must ensure footwear is not presented as sufficient control for a wet roof.",
}
reader_holds = {
    3: "Look for solid footing on a dew-slick roof is source text, not a complete safe-work method. Confirm 足元 and 安定した足元 language and safety sequence before learner-facing instructions.",
    4: "Source says boots with good grip; archived 作業靴 is broader work shoes, and footwear alone does not resolve wet-roof hazard.",
    6: "Do not work the roof in lightning; confirm Japanese 雷 sense and stop/evacuation timing before scoring or audio.",
    7: "Storm coming / come down now must be coordinated with the speaking objective's lightning approach, not delayed until visible lightning or a storm already arrives.",
    8: "Broad 'if weather changes' trigger needs qualified safety context and must not weaken the immediate storm/lightning instruction in Reader 7.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:23:ja-en:card:{n}",
        "legacySourceRef": f"roofing:23:ja-en:cards:{n}",
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
        "id": f"roofing:23:ja-en:line:{n}",
        "legacySourceRef": f"roofing:23:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:23:ja-en",
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
    "curriculumAdaptationNote": "Preserve the current source sequence: at 6:30 dew remains on the roof; foreman warns the roof is wet; crew seeks solid footing and wears grip boots; later wind rises and dark clouds appear; source prohibits roof work in lightning; foreman calls for immediate descent as a storm approaches; final line says stop and come down if weather changes. The source's broad weather-change trigger, roof work on dew and footwear claims require qualified roofing/weather safety review. The speaking objective explicitly says bring crew down when lightning approaches, while archived speaking opening mentions only an approaching storm; keep those cues coherent. Archived 雷 can mean thunder or lightning and 作業靴 is broader than boots. Current curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 23 packet build --check")
else:
    path.write_text(output)
    print(path)
