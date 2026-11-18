#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 30 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[30];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[30];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[29];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][3]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 30
assert archived["stableId"] == "roofing:30:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 16
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    3: "Spanish Instalación is a noun while the English card says install and archived 施工する is a verb. Settle the part-of-speech and practice target rather than silently grading a different form.",
    5: "Closeout / cierre de obra is the job closeout process, while archived 完了確認 is a final check. Confirm whether outstanding items and documentation belong in this sense.",
    8: "Generic flashing / tapajuntas has several roof-system forms. Confirm archived 水切り板金 for this lesson's installation scope and contextual dictionary entry.",
    9: "Tarp / lona is a temporary covering, while archived 防水シート can denote installed waterproofing material. Confirm the emergency-covering sense before a scored weather instruction.",
    10: "Punch list / lista de pendientes records work remaining for closeout. Confirm 残工事リスト and whether it covers more than construction work in this scene.",
    12: "Source says tie off before going on the roof. Archived Japanese specifies connecting a harness to an anchor, which the source does not approve or identify; hold for qualified fall-protection review.",
    13: "Source orders stop and descent if weather changes, but the scene later has a storm warning. Confirm the site weather trigger, descent and communication sequence without inventing an unsafe universal rule.",
    14: "The closing roof walk requires safe access after a storm warning and a partially covered section. Hold any scored command until qualified site/roof safety review.",
    15: "Tear-off then installation is the source's broad sequence. Keep it contextual; do not imply installation proceeds during unsafe weather or before deck/underlayment checks.",
}
reader_holds = {
    3: "The tie-off command has no identified approved anchor or roof-access method; archived Japanese adds a specific harness-to-anchor action. Qualified fall-protection review needed.",
    4: "Tear-off then installation is a broad sequence and must remain conditional on the later deck and weather checks in this source scene.",
    5: "Source deck is broader than archived 野地板 if the roof system differs; flashing/underlayment order and product-specific scope need qualified trade review.",
    6: "A storm warning arrives before the quoted conditional weather-change command. Confirm the timing and whether work stops immediately under the site weather plan.",
    7: "The crew tarps an unfinished section after the storm warning. Confirm safe access, tie-off, wind and temporary-covering procedure; archived 防水シート may imply installed membrane.",
    8: "The end-of-day roof walk follows a storm warning and temporary tarp. Confirm safe roof access and exact closeout authority before a scored command.",
    9: "Punch-list and closeout senses must preserve unresolved work rather than imply final acceptance. Confirm Japanese terms and documentation context.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:30:ja-en:card:{n}",
        "legacySourceRef": f"roofing:30:ja-en:cards:{n}",
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
        "id": f"roofing:30:ja-en:line:{n}",
        "legacySourceRef": f"roofing:30:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:30:ja-en",
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
    "curriculumAdaptationNote": "The current source objective explicitly says lead a complete roofing day in Spanish, while this exact Japanese-to-English adaptation proposes Japanese. Preserve the source's capstone sequence and flag that curriculum-language change for approval. Morning briefing and tie-off precede tear-off; a ready deck leads to underlayment/flashing checks; a storm warning arrives, the foreman gives a conditional stop/descent command, the crew covers an unfinished section, and final roof walk plus punch list close the day. The source does not identify an approved anchor, weather threshold, temporary-tarp procedure or product system. Hold fall-protection, storm response, roof-walk and installation commands for qualified safety/product review; do not silently register the archived Japanese as scored text. Current curriculum has no authored verb-example list; archived forms are conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 30 packet build --check")
else:
    path.write_text(output)
    print(path)
