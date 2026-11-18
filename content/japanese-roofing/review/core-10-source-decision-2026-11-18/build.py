#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 10 source-decision packet."""

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
    "verbs": "public/lesson-content/es/roofing.json",
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-10-12-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[10];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[10];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[9];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 10
assert archived["stableId"] == "roofing:10:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 14
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    9: "The source directs tarping anything unfinished today in this weather scene. Confirm the job-specific work scope and safe method; archived 養生シート may not convey a secured weather tarp in every roofing context.",
    10: "The source commands stopping work and coming down if weather changes. The real decision depends on site weather/egress/fall-protection plan; do not convert this into a universal threshold or imply descending during unsafe conditions is always safe.",
    11: "Cover this section before leaving refers to the unfinished rear area; qualified safety review must check that it can be covered safely in current wind.",
    12: "Tie down the tarp well is a rope-securement action; archived 固定してください omits tying and may imply an unspecified fastening method. Align with Reader 7.",
}
reader_holds = {
    4: "Open deck is the exposed structural deck, not generic underlayment. Archived 屋根下地 needs a trade-term decision before weather/damage claim is selected.",
    5: "The rear unfinished section must be covered before departure; ensure the Japanese line stays inside the scene's safe work plan and does not become generic roofing advice.",
    6: "The source calls for tarping unfinished work today; weather, wind and safe tarp installation method need qualified roofing review.",
    7: "Amarren with rope explicitly means tie down. Archived 固定 may not preserve the rope action or adequate securement, and wind makes safety context important.",
    8: "Stop work and come down if weather changes is a source instruction requiring site-specific weather/egress/fall-protection review; do not invent a universal threshold.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:10:ja-en:card:{n}",
        "legacySourceRef": f"roofing:10:ja-en:cards:{n}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"],
        "sourceNoteSpanish": word.get("note"), "kind": word["kind"],
        "selectedJapanese": None, "audioScript": None,
        "candidateJapanese": None if n in card_holds else draft["ja"],
        "archivedJapanese": draft["ja"], "archivedEnglish": draft["en"],
        "reviewNote": card_holds.get(n), "reviewed": False,
    })

reader = []
for n, (es, en, draft) in enumerate(zip(passage["es"], passage["en"], archived["reader"]), 1):
    assert en == draft["en"]
    reader.append({
        "id": f"roofing:10:ja-en:line:{n}",
        "legacySourceRef": f"roofing:10:ja-en:reader:{n}",
        "sourceSpanish": es, "sourceEnglish": en,
        "selectedJapanese": None, "audioScript": None,
        "candidateJapanese": None if n in reader_holds else draft["ja"],
        "archivedJapanese": draft["ja"], "archivedEnglish": draft["en"],
        "reviewNote": reader_holds.get(n), "reviewed": False,
    })

assert set(archived["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
packet = {
    "schema": 1, "kind": "inert-source-review",
    "pair": {"target": "Japanese", "native": "English"},
    "stageId": "roofing", "lessonId": "roofing:10:ja-en",
    "source": {name: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for name, path in FILES.items()},
    "orderedSourceRowsSha256": hashlib.sha256(json.dumps([[row["sourceSpanish"], row["sourceEnglish"]] for row in cards + reader], ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
    "sourceEnglishTitle": lesson["title"],
    "sourceEnglishObjective": lesson["objective"],
    "sourceEnglishSpeaking": lesson["speaking"],
    "sourceSpanishReaderTitle": passage["title"],
    "candidateObjective": archived["objective"],
    "candidateFocus": archived["focus"],
    "archivedForms": archived["forms"],
    "archivedSpeaking": archived["speaking"],
    "audioScript": None,
    "curriculumAdaptationNote": "Preserve the exact nine-turn 4:00 windy scene: forecast rain tonight, unfinished rear section, open deck at risk, cover before leaving, tarp unfinished work, tie tarp with rope, stop work and come down if conditions change, and repeat the plan. The source teaches conditional commands for this scene, not a universal roof-weather threshold. Resolve structural deck, tarp securement and safe weather egress with qualified Japanese/roofing reviewers before selecting scored answers. Archived Japanese, forms and speaking are evidence only; this packet creates no learner, audio, score or saved-progress identity.",
    "cards": cards, "reader": reader,
    "sourceVerbExamples": [{"spanishInfinitive": v["infinitive"], "englishMeaning": v["native"], "sourceSpanish": v["example"]["target"], "sourceEnglish": v["example"]["native"], "sourceNote": v.get("note")} for v in json.loads((ROOT / FILES["verbs"]).read_text())["lessons"]["10"]["verbs"]],
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
    print("PASS Japanese Roofing Core 10 packet build --check")
else:
    path.write_text(output)
    print(path)
