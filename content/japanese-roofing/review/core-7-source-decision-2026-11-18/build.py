#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 7 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-7-9-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[7];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[7];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[6];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 7
assert archived["stableId"] == "roofing:7:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    2: "Spanish Tejas asfálticas specifies asphalt shingles; archived シングル材 is generic. Decide whether material specificity belongs in the Japanese face, Reader disposal line, dictionary and modes.",
    3: "Deck is the structural roof deck at the tear-off endpoint; archived 屋根下地 could mean underlayment or general substrate. Choose a trade-precise term before scored commands.",
    4: "Old roof in the source is broader than archived 既存の屋根 (existing roof). Confirm whether old/age and complete roof versus covering must be explicit.",
    7: "Sub-capa / Fieltro may imply felt or underlayment, while archived ルーフィング can name roofing material more broadly. Resolve layer/material scope.",
    9: "Tapajuntas / flashing is a broad component; archived 水切り板金 may narrow to edge flashing. Confirm the component before removal instruction.",
    10: "This scene's command removes everything down to the structural deck; archived 屋根下地 and 全て must not silently approve universal full tear-off or change the endpoint.",
    11: "Inherits asphalt-shingle specificity from card 2; disposal command is scene-specific and must match the source's designated dumpster.",
    12: "Remove all the layers is the source scene's scope, not a universal procedure; confirm with site-approved work scope and safety review.",
    13: "The source explicitly removes flashing too in this job. Preserve scope without implying all projects remove flashing; align with card 9 and Reader 5.",
}
reader_holds = {
    1: "Archived 既存の屋根 says existing roof; source says old roof. Confirm old/age and removal scope in the scene.",
    3: "Structural deck endpoint and all-material scope inherit card 10's unresolved terminology and job-specific safety decision.",
    4: "All layers including underlayment must preserve source scope; resolve ルーフィング versus felt and approved tear-off plan.",
    5: "Flashing removal is explicit in this scene, but Japanese component wording and actual work scope require source/trade review.",
    7: "Shingles are asphalt in Spanish source; archived シングル材 omits asphalt. Keep the designated dumpster, not a new disposal method.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:7:ja-en:card:{n}",
        "legacySourceRef": f"roofing:7:ja-en:cards:{n}",
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
        "id": f"roofing:7:ja-en:line:{n}",
        "legacySourceRef": f"roofing:7:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:7:ja-en",
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
    "curriculumAdaptationNote": "Preserve the nine-turn tear-off scene and exact 15-card source order: old roof, all layers including underlayment, flashing, pry bar, designated dumpster, and the foreman's two confirmation questions. Spanish source specifies asphalt shingles while English is generic; resolve material, structural deck, underlayment/felt and flashing senses with qualified Japanese/roofing reviewers. These commands describe this job's stated scope, not a universal tear-off method or approval to remove retained components. Archived Japanese and forms/speaking are evidence only; this packet creates no learner, audio, scoring or saved-progress identity.",
    "cards": cards, "reader": reader,
    "sourceVerbExamples": [{"spanishInfinitive": v["infinitive"], "englishMeaning": v["native"], "sourceSpanish": v["example"]["target"], "sourceEnglish": v["example"]["native"], "sourceNote": v.get("note")} for v in json.loads((ROOT / FILES["verbs"]).read_text())["lessons"]["7"]["verbs"]],
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
    print("PASS Japanese Roofing Core 7 packet build --check")
else:
    path.write_text(output)
    print(path)
