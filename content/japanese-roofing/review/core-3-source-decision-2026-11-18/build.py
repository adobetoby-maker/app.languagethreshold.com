#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 3 source-decision packet."""

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
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/core-1-3-draft.json",
}
JS = r"""
import {build} from 'esbuild';
async function load(file) {
  const result = await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[3];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[3];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[2];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 3
assert archived["stableId"] == "roofing:3:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    1: "Water-diverting flashing is broader than metal sheet flashing. Confirm 水切り板金 for this roof detail and regional trade register.",
    2: "Confirm that 段状水切り板金 denotes individual step-flashing pieces at a wall, not a generic stepped flashing shape.",
    4: "The English ice and water shield is a specific water-barrier category; 自己粘着防水シート asserts self-adhesion that the Spanish generic membrane does not say. Resolve product and source scope.",
    9: "屋根用アスファルトセメント narrows roofing cement to asphalt cement. Confirm material and dictionary sense before selecting.",
    10: "The source says step flashing under each shingle course. This is an installation claim requiring qualified roofing/source review, including placement and shingle type.",
    11: "The Japanese conveys laying the membrane along the valley but may lose the English run ... up the valley directional extent. Resolve the installation meaning and shield material.",
    12: "The broad flashing term inherits card 1's material and detail-scope question.",
    14: "Seal around the chimney is potentially incomplete as a roof water-entry instruction. Keep it source-pinned and obtain qualified source/safety review before teaching an unqualified sealant-only action.",
}
reader_holds = {
    1: "The source says water often gets in; ことがあります weakens this to mere possibility. Preserve frequency in a reviewed Japanese answer.",
    2: "The source locates joints at valleys, chimneys and walls; the archived そば can mean only near them. Verify exact location and roof-detail sense.",
    3: "The flashing term inherits card 1's technical material and scope decision.",
    4: "The step-flashing term inherits card 2's exact wall-detail decision.",
    6: "The source's at the front can locate a valley on the roof plan; 手前 is relative to the speaker. Confirm the scene viewpoint.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:3:ja-en:card:{n}",
        "legacySourceRef": f"roofing:3:ja-en:cards:{n}",
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
        "id": f"roofing:3:ja-en:line:{n}",
        "legacySourceRef": f"roofing:3:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:3:ja-en",
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
    "curriculumAdaptationNote": "Preserve the source water-entry scene and exact flashing/valley/chimney meanings. Resolve Japanese flashing, step-flashing, shield material, roofing cement and sealant-only implications with qualified Japanese and roofing reviewers before selecting learner answers. The archived draft is evidence only; this packet creates no lesson, score, audio or progress identity.",
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
    print("PASS Japanese Roofing Core 3 packet build --check")
else:
    path.write_text(output)
    print(path)
