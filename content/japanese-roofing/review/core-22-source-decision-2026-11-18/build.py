#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 22 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[22];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[22];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[21];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][1]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 22
assert archived["stableId"] == "roofing:22:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 14
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 8

card_holds = {
    2: "Archived 親綱 may imply a particular lifeline type. Confirm the actual fall-protection system and distinguish lifeline from generic rope; source does not specify vertical/horizontal configuration.",
    3: "Fall distance is a system calculation, not necessarily clearance. Confirm whether archived 墜落距離 conveys the intended measure and preserves site-specific verification.",
    6: "Competent person is a defined safety role in the source context. Archived 適任者 may not carry that qualification or local legal role; settle locale/role before scoring.",
    10: "Source says use the roof anchor and do not improvise, but does not establish that any roof anchor is approved for this system. Archived 自己判断で別の場所に接続しない is a plausible gloss; require site-specific approved anchor and competent-person review.",
    11: "The observed problem is with the lifeline, but the line declares the anchor unsafe before inspection. Preserve source claim as evidence and resolve whether the safety action should identify the system as suspect, without teaching an unsupported diagnosis.",
    12: "Competent person role needs qualified locale/safety terminology; archived 適任者 is not automatically the defined role.",
    13: "Lifeline damage check needs the specific system and inspection procedure; archived 親綱 may narrow line type, and a visual check alone does not clear use.",
    14: "Anchor setup confirmation must be by the qualified responsible person under the site-specific fall-protection plan. The isolated command could imply any crew member can clear it.",
}
reader_holds = {
    1: "Archived 親綱 narrows lifeline type; confirm actual system and avoid an unsupported equipment assumption.",
    3: "Source observes a lifeline concern then declares anchor unsafe. Hold this diagnosis until qualified source/safety review while retaining exact source words.",
    4: "Competent person is a defined source role; settle 適任者 and locale/legal meaning.",
    5: "Archived 親綱 may narrow line type; inspection of damage needs site-specific procedure and a qualified decision before reuse.",
    6: "Confirm whether 墜落距離 represents source fall distance and whether the source should address required clearance/site-specific geometry; the competent-person role also needs precise terminology.",
    7: "Anchor setup confirmation cannot be treated as a generic crew clearance. Preserve the qualified/site-specific gate.",
    8: "A harness alone does not ensure protection, but source 'no use' is an absolute safety claim. Confirm a precise, non-misleading Japanese rendering of system failure.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:22:ja-en:card:{n}",
        "legacySourceRef": f"roofing:22:ja-en:cards:{n}",
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
        "id": f"roofing:22:ja-en:line:{n}",
        "legacySourceRef": f"roofing:22:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:22:ja-en",
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
    "curriculumAdaptationNote": "Preserve the current source sequence: a worker sees a lifeline concern and stops; the foreman calls stop and says the anchor is unsafe; they ask for the competent person; the line is checked; that person confirms system fall distance and anchor setup before work resumes; the final line emphasizes that a harness depends on anchor/lanyard integrity. The source moves from a line concern to an anchor diagnosis without supporting inspection. Hold that diagnosis and any command implying an unspecified roof anchor is approved. Clarify the competent-person role, 親綱 versus generic lifeline/rope, site-specific fall-distance measure, and who may clear the setup. Archived Japanese, modes, forms and speaking are evidence, not selected safety instruction. Current curriculum has no authored verb-example list; no learner/audio/progress identity is created.",
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
    print("PASS Japanese Roofing Core 22 packet build --check")
else:
    path.write_text(output)
    print(path)
