#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 27 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[27];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[27];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[26];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 27
assert archived["stableId"] == "roofing:27:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    1: "Ventilación de caballete/de caja is a ridge/box vent in the source card; archived 換気口 is generic. Confirm whether the subtype must appear in the Japanese face and linked Reader context.",
    2: "Pipe boot / tapajuntas para tubo is a roof-penetration flashing component. Confirm 配管貫通部用ブーツ with a roofing specialist and dictionary sense, not a generic plumbing boot.",
    3: "Flashing / tapajuntas has product-specific forms around vents, pipe boots and other penetrations. Confirm 水切り板金 is the right generic Japanese headword for this source scope.",
    5: "Sealant / sellador is a product-specific material; do not equate the source with one approved sealant type or universal repair method.",
    10: "The imperative to inspect flashing around this vent depends on the flashing/vent sense and safe roof access; confirm the Japanese trade term and site inspection context.",
    11: "The photo record covers flashing around each penetration. Confirm product and dictionary scope of 水切り板金, and preserve each penetration rather than a sample-only check.",
    13: "Cracked pipe boot is a specific component condition. Confirm Japanese boot terminology and crack inspection sense before a scored question.",
    15: "Seal exposed nails is a source command. Confirm the approved roof system, fastener condition, sealant and repair procedure before selecting a scored instruction.",
}
reader_holds = {
    4: "The vent flashing inspection command uses a product-specific term and depends on safe access; qualified roofing and Japanese review needed.",
    5: "Pipe-boot crack question needs the same component/dictionary sense as card 13 and an inspection decision.",
    6: "Archived Japanese adds an explicit water-entry mechanism to the source's possible leak claim. Confirm the intended conditional scope without strengthening the source.",
    7: "The source asks for a photo around each penetration; preserve the full inspection/documentation scope and flashing sense.",
    8: "Exposed-nail sealing is a repair command with unspecified product and condition. Hold it for qualified roofing safety/product review.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:27:ja-en:card:{n}",
        "legacySourceRef": f"roofing:27:ja-en:cards:{n}",
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
        "id": f"roofing:27:ja-en:line:{n}",
        "legacySourceRef": f"roofing:27:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:27:ja-en",
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
    "curriculumAdaptationNote": "Preserve the source sequence: before finishing, the foreman and crew lead walk every roof penetration, ask what was checked, inspect vent flashing and a possible cracked pipe boot, photograph flashing around each penetration, and seal exposed nails. The source asks for a complete check but does not specify a roof system, sealant, repair procedure, inspection access plan or photo acceptance rule. Keep vent subtype, pipe-boot and flashing senses under qualified Japanese/roofing/dictionary review; do not invent a universal repair rule. Current curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 27 packet build --check")
else:
    path.write_text(output)
    print(path)
