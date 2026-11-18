#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 29 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[29];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[29];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[28];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][2]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 29
assert archived["stableId"] == "roofing:29:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 15
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    1: "Punch list / lista de pendientes is a construction closeout record. Archived 残工事リスト may narrow it to remaining physical work; confirm site register, unresolved inspection and acceptance senses.",
    4: "Open item / pendiente can mean unresolved or incomplete, not necessarily untouched. Archived 未対応項目 says not yet addressed; confirm status meaning in this scene.",
    10: "Open areas for tomorrow refers to unfinished roof sections. Archived 残っている箇所 may omit the unresolved-work status; confirm exact handoff sense.",
    11: "Safe place is unspecified in the source. Keep the storage instruction scoped to the site's approved material location; do not invent a universal location or rule.",
    12: "Walking the roof at closeout is the source's scene instruction. Qualified fall-protection/access review must decide whether this phrase can be scored without site-specific controls.",
    13: "This is still open means the chimney-side section remains unfinished. Archived 未対応 can imply never addressed; confirm status and dictionary sense.",
    15: "Punch-list entry records the open work, not completed acceptance or authorization. Confirm Japanese list terminology and site closeout process.",
}
reader_holds = {
    2: "End-of-day roof walk before declaring the job complete is source-authored. Qualified site/fall-protection review must keep the scene from implying unrestricted roof access.",
    4: "One chimney-side section is unfinished. Archived 仕上がっていません may imply finish-quality rather than work not complete; confirm state.",
    5: "This is still open refers to that unfinished section. Archived 未対応 may imply no work has begun; confirm ongoing-status meaning.",
    8: "Safe material storage is source-authored but location and securing method are unspecified. Preserve the source without inventing universal site rules.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:29:ja-en:card:{n}",
        "legacySourceRef": f"roofing:29:ja-en:cards:{n}",
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
        "id": f"roofing:29:ja-en:line:{n}",
        "legacySourceRef": f"roofing:29:ja-en:reader:{n}",
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
    "stageId": "roofing", "lessonId": "roofing:29:ja-en",
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
    "curriculumAdaptationNote": "Preserve the current end-of-day scene: crew packs tools; foreman asks for a roof walk before calling the job complete; a chimney-side section is unfinished; the crew adds it to a punch list; tomorrow's first task is to finish it; remaining materials are stored in a safe place; the list supports the handoff. Open/pending is not necessarily untouched, and a punch list is a record of remaining work rather than approval that a roof is complete. The roof walk and storage location require site-specific safety review. Current curriculum has no authored verb-example list; archived forms remain conditional evidence. No selected learner/audio text or progress identity is created.",
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
    print("PASS Japanese Roofing Core 29 packet build --check")
else:
    path.write_text(output)
    print(path)
