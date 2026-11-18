#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 17 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-16-18-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[17];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[17];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[16];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 17
assert archived["stableId"] == "roofing:17:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    2: "Source teja asfáltica specifies asphalt shingle. Archived シングル材 names a shingle material generically; confirm the material sense and consistent Japanese term.",
    7: "Wrapper / envoltura del paquete is product packaging; archived 包装紙 specifies paper. Confirm actual packaging material or use material-neutral wording.",
    10: "The four-nail count is only the guide's language example, not this product's requirement. Archived declarative Japanese face lacks attribution and may teach a universal installation rule.",
    12: "This shingle refers to the selected asphalt shingle product; retain the product/material distinction when resolving the archived generic シングル材.",
    13: "Archived 包装紙 specifies paper while source wrapper does not; preserve the package-instruction sense without asserting paper packaging.",
    14: "Same pattern on every shingle applies only after selecting this product's manufacturer pattern. Isolated card omits that scope; do not teach one pattern as universal across products.",
}
reader_holds = {
    1: "Source says asphalt shingles; confirm archived アスファルトシングル材 and card 2 use a consistent material term.",
    2: "Retain this specific shingle/product context; card 12 has the same material distinction.",
    3: "Guide-attributed four-nail count is an example, not a universal installation requirement; preserve explicit attribution.",
    5: "Archived 包装紙 specifies paper, but source only says package wrapper. Confirm material-neutral trade wording.",
    8: "Same pattern on every shingle is scoped to the product instructions just checked. Keep that sequence and avoid a universal cross-product rule.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:17:ja-en:card:{n}",
        "legacySourceRef": f"roofing:17:ja-en:cards:{n}",
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
        "id": f"roofing:17:ja-en:line:{n}",
        "legacySourceRef": f"roofing:17:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:17:ja-en",
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
    "curriculumAdaptationNote": "Preserve the current source sequence: open a new asphalt-shingle package; ask the nail count; attribute four nails per shingle to a guide example; inspect this manufacturer's instructions and package wrapper; obtain this product's exact pattern; then repeat that selected pattern on its shingles. Four nails is not a universal specification, nor is one pattern shared across all products. Archived Japanese narrows wrapper to paper and uses generic shingle wording; hold those faces for qualified source/roofing/Japanese review. Current curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 17 packet build --check")
else:
    path.write_text(output)
    print(path)
