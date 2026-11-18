#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 24 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[24];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[24];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[23];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 24
assert archived["stableId"] == "roofing:24:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    6: "Heat exhaustion / agotamiento por calor is a clinical occupational-heat term. Confirm archived 熱疲労 against the intended Japanese diagnosis/symptom distinction; do not silently substitute broader 熱中症.",
    10: "Hourly water breaks are stated in this source scene, while the speaking objective says to act under the site heat plan. Confirm that an isolated card does not imply a universal schedule.",
    13: "Shade and rest are direct source commands to a dizzy worker. Keep the words but hold the response sequence for qualified site heat-plan and domain review.",
    14: "Drink water now is a direct source command in the dizziness scene. Confirm how it fits the site heat response and escalation plan before a scored safety instruction.",
    15: "Source se siente mal means feeling unwell; archived 気分が悪い may be read as nausea or mood. Confirm the symptom-reporting sense and site-plan escalation context.",
}
reader_holds = {
    2: "Hourly break is the foreman's instruction in this source scene, not necessarily a universal rule; align it with the site heat plan in the speaking objective.",
    3: "Source says Raúl does not look well; archived 顔色が悪い adds pallor or poor complexion as a specific observation. Remove that invented sign or obtain source approval.",
    5: "The direct dizziness question is accurate in form, but a positive response drives the following safety sequence. Confirm clinical and site-plan linkage before scored deployment.",
    7: "Shade, rest and water are source commands to a dizzy worker. Qualified heat-plan review must assess the escalation and symptom-response sequence without erasing the source vocabulary.",
    8: "Source says we will follow the site heat plan. Archived Japanese present phrasing can obscure the crew commitment; confirm subject, timing and escalation wording.",
    9: "Hydration and shade rest help prevent heat exhaustion is the source's factual claim. Qualified occupational-heat/clinical review must confirm its scope and Japanese 熱疲労 sense.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:24:ja-en:card:{n}",
        "legacySourceRef": f"roofing:24:ja-en:cards:{n}",
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
        "id": f"roofing:24:ja-en:line:{n}",
        "legacySourceRef": f"roofing:24:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:24:ja-en",
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
    "curriculumAdaptationNote": "Preserve the source scene and clinical vocabulary directly: heat on the roof; the foreman's hourly water-break instruction; Raúl appears unwell; the foreman asks how he feels and whether he is dizzy; Raúl says yes; the foreman directs shade, rest and water, asks for symptom reporting, and commits to the site heat plan; the closing line says hydration and shade rest help prevent heat exhaustion. The archived Reader invents a specific pallor observation. The isolated hourly schedule and response sequence need qualified site heat-plan/clinical review, and 熱疲労 needs a contextual dictionary decision. Current curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 24 packet build --check")
else:
    path.write_text(output)
    print(path)
