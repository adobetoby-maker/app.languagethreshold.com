#!/usr/bin/env python3
"""Rebuild the inert Japanese Roofing Core 21 source-decision packet."""

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
const words=(await load('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[21];
const passage=(await load('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[21];
const lesson=(await load('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[20];
process.stdout.write(JSON.stringify({words,passage,lesson:{n:lesson.n,title:lesson.title,objective:lesson.objective,speaking:lesson.steps[2].instruction}}));
"""

source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
archived = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][0]
words, passage, lesson = source["words"], source["passage"], source["lesson"]
assert lesson["n"] == archived["n"] == 21
assert archived["stableId"] == "roofing:21:ja-en"
assert lesson["title"] == archived["titleEnglish"]
assert lesson["objective"] == archived["sourceEnglishObjective"]
assert lesson["speaking"] == archived["sourceEnglishSpeaking"]
assert len(words) == len(archived["cards"]) == 14
assert len(passage["es"]) == len(passage["en"]) == len(archived["reader"]) == 9

card_holds = {
    1: "The source says harness, while archived フルハーネス narrows it to a full-body model. Confirm the intended personal fall-arrest equipment and dictionary sense before selecting a face.",
    2: "Tie-off / anclarse is the act of connecting to an approved anchorage; archived 墜落防止用の接続 is a description, not necessarily the trade command. Qualified Japanese and fall-protection review required.",
    3: "Roof anchor / anclaje de techo names an approved attachment point in this scene. Archived 屋根のアンカー may imply any roof-mounted point; do not treat a visible point as approved.",
    4: "Lanyard / eslinga also has Spanish note cuerda de seguridad. Confirm archived ランヤード identifies the correct connector for the actual system; keep the note distinct from an interchangeable rope claim.",
    5: "Fall protection is a system-level term; archived 墜落防止 may imply prevention only. Distinguish prevention, restraint and arrest in the dictionary sense.",
    9: "The isolated command says tie off before roof access, but gives no approved anchor, method or access-point arrangement. Preserve the source without treating the archived Japanese as a complete safe-work instruction.",
    10: "Use the roof anchor — don't freelance does not identify who approved the anchor or which connection is permitted. Archived 自己判断で別の場所に接続しないでください is plausible but remains an unreviewed safety command.",
    11: "The isolated lanyard-short-enough sentence is unsafe as a complete fall-clearance rule: system clearance depends on more than lanyard length. Hold source correction and all Japanese selection pending qualified fall-protection review.",
    12: "Show me the approved anchor requires prior approval and a clear identification procedure. Archived 承認されたアンカー is unreviewed.",
    13: "Check your harness before climbing omits inspection criteria and the full system. Hold as a source-attributed line, not an approved checklist.",
    14: "Nobody goes up without a harness could wrongly imply a harness alone is sufficient. Hold until the source describes a correctly connected fall-protection system and site-specific controls.",
}
reader_holds = {
    2: "Nobody goes up without a harness may imply the harness alone controls the edge hazard; preserve source and hold an unqualified safety instruction.",
    3: "Buckle, lanyard and straps are only a partial inspection list; the line does not establish equipment condition or an approved system.",
    4: "Tie off before roof access lacks the access-point, approved anchorage and connection procedure; do not turn it into a self-contained method.",
    5: "Show me the approved anchor requires a prior competent approval decision; a visible anchor is not automatically approved.",
    6: "The stop-and-report instruction if no anchor is visible is useful source language but may not identify the approved access/anchor plan. Preserve the exact line, pending trade review.",
    8: "Fall protection only works if used correctly is broad; distinguish the approved system and required inspection, clearance and rescue plan before learner promotion.",
    9: "A thumbs-up after tying off is not a documented verification of the connection or system. Hold the source's implied sufficiency for qualified safety review.",
}

cards = []
for n, (word, draft) in enumerate(zip(words, archived["cards"]), 1):
    assert word["en"] == draft["en"] and word["kind"] == draft["kind"]
    cards.append({
        "id": f"roofing:21:ja-en:card:{n}",
        "legacySourceRef": f"roofing:21:ja-en:cards:{n}",
        "sourceSpanish": word["es"], "sourceEnglish": word["en"],
        "sourceNoteSpanish": word.get("note"), "kind": word["kind"],
        "selectedJapanese": None,
        "candidateJapanese": None,
        "archivedJapanese": draft["ja"], "archivedEnglish": draft["en"],
        "reviewNote": card_holds.get(n), "reviewed": False,
    })

reader = []
for n, (es, en, draft) in enumerate(zip(passage["es"], passage["en"], archived["reader"]), 1):
    assert en == draft["en"]
    reader.append({
        "id": f"roofing:21:ja-en:line:{n}",
        "legacySourceRef": f"roofing:21:ja-en:reader:{n}",
        "sourceSpanish": es, "sourceEnglish": en,
        "selectedJapanese": None,
        "candidateJapanese": None,
        "archivedJapanese": draft["ja"], "archivedEnglish": draft["en"],
        "reviewNote": reader_holds.get(n), "reviewed": False,
    })

assert set(archived["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
packet = {
    "schema": 1, "kind": "inert-source-review",
    "pair": {"target": "Japanese", "native": "English"},
    "stageId": "roofing", "lessonId": "roofing:21:ja-en",
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
    "internalSafetyReferences": [
        {
            "authority": "OSHA",
            "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.502",
            "section": "1926.502(d)(15)-(16)",
            "use": "Source review of anchorage and lower-level clearance; not learner-facing instruction",
        },
        {
            "authority": "OSHA",
            "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926SubpartMAppC",
            "section": "Appendix C, non-mandatory guidance",
            "use": "Review of total fall-distance and inspection factors; not an approved site plan",
        },
    ],
    "curriculumAdaptationNote": "Preserve the exact source sequence as evidence: foreman gathers the crew, identifies edge hazard, checks harness components, orders tie-off before roof access, asks for approved anchor, stops access if no anchor is visible, adds hard hat, and takes a thumbs-up. The source's isolated lanyard-length rule is incomplete for a personal fall-arrest system; OSHA guidance includes free-fall distance, deceleration, harness shift, worker height and safety margin in fall clearance. A harness alone and a thumbs-up do not establish a safe system or verified connection. All 14 card and nine Reader Japanese candidates remain unselected. Qualified roofing safety, Japanese and dictionary review must resolve a source correction before a learner-facing instruction or audio script is authored. Current curriculum has no authored verb-example list; archived forms and six mode labels remain conditional evidence. No progress identity is created.",
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
    print("PASS Japanese Roofing Core 21 packet build --check")
else:
    path.write_text(output)
    print(path)
