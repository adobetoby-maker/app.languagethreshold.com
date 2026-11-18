#!/usr/bin/env python3
"""Rebuild an inert Japanese Roofing Master source-decision packet."""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
N = int(re.search(r"master-(\d+)-source-decision", HERE.name).group(1))
FILES = {
    "curriculum": "src/data/master-roofing-curriculum.ts",
    "sourceContent": "public/lesson-content/es/master-roofing.json",
    "archivedDraft": "content/review-archive/french-japanese-2026-11-15/japanese-roofing/master-1-3-draft.json",
}
JS = r"""
import {build} from 'esbuild';
const b=await build({entryPoints:['src/data/master-roofing-curriculum.ts'],bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
process.stdout.write(JSON.stringify(m.MASTER_ROOFING_LESSONS[Number(process.argv[1])-1]));
"""
lesson = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS, str(N)], cwd=ROOT, text=True))
content = json.loads((ROOT / FILES["sourceContent"]).read_text())["lessons"][str(N)]
archive = json.loads((ROOT / FILES["archivedDraft"]).read_text())["lessons"][N - 1]
assert lesson["n"] == archive["n"] == N
assert archive["stableId"] == f"master-roofing:{N}:ja-en"
assert lesson["title"] == archive["titleEnglish"]
assert lesson["objective"] == archive["sourceEnglishObjective"]
assert lesson["steps"][2]["instruction"] == archive["sourceEnglishSpeaking"]
words = lesson["words"]
passage = content["passage"]
assert len(words) == len(archive["cards"])
assert len(passage["target"]) == len(passage["native"]) == len(archive["reader"])
CARD_HOLDS = {
    1: {
        2: "Roof deck/野地板 is assembly-dependent; confirm this exact deck sense before use in scored roof-system instructions.",
        4: "Drip-edge material, placement and relation to underlayment depend on the approved roof system and manufacturer; trade review required.",
        7: "Ice-and-water shield is a product class, not a universal installation prescription; confirm locale, scope and dictionary sense.",
        8: "Generic flashing has multiple forms; confirm selected Japanese sense for the chimney/wall context.",
        11: "Ridge cap product and installation sequence vary; confirm roof-system context.",
        12: "Ridge vent is not present on every roof design; confirm source lesson's assembly as a scene rather than a universal rule.",
    },
    2: {
        2: "To stagger is a roofing layout action; confirm the verb and manufacturer-specific offset.",
        4: "Course means a row of shingles, not a training course; dictionary sense needs approval.",
        5: "Tab and slot apply to a particular shingle profile; confirm terminology and system context.",
        6: "Slot between tabs is profile-specific; confirm exact Japanese noun and source design.",
        10: "Chalk line/墨線 can describe a marked guideline; confirm roofing trade usage.",
        12: "Sealant strip and wind adhesion vary by product; confirm exact roofing sense.",
        16: "Manufacturer-specified staggering is an instruction; keep source specificity and await trade review.",
    },
}[N]
READER_HOLDS = {
    1: {
        3: "Layer order depends on roof-system details; the source teaches a scene, not a universal installation sequence.",
        4: "Solid/dry deck conditions need product and site-specific confirmation before scored instruction.",
        5: "Drip edge placement and gutter drainage depend on design and manufacturer; trade review required.",
        6: "Ice-and-water shield at eave/valley depends on climate, product and code; do not teach as universal.",
        9: "Starter/shingle sequence and overlap are system-specific; trade review required.",
        10: "Never under it is too absolute for actual roof performance; retain source wording as evidence and qualify before scoring.",
        11: "Flashing details at chimney/wall are design-specific; trade review required.",
        12: "Ridge vent/cap sequence is system-specific; trade review required.",
        13: "Ridge ventilation design is not universal; trade review required.",
    },
    2: {
        3: "If joints line up, water gets in is a source generalization; avoid treating it as a universal failure prediction.",
        5: "Manufacturer offset governs; retain this condition explicitly in any final Japanese instruction.",
        6: "Course overlap and water path depend on product design; trade review required.",
        7: "Slots and underlayment describe a particular shingle system; confirm profile and wording.",
        8: "Moisture-to-interior leak timeline is illustrative; do not present as a fixed outcome.",
        9: "Too late is an absolute source phrase; confirm natural Japanese and risk framing.",
        10: "Sealant-strip adhesion and wind uplift need product/conditions context.",
        11: "Pattern check and chalk-line action are site/manufacturer instructions; trade review required.",
        14: "Roof longevity claim is not guaranteed; confirm source meaning and consumer-facing claim before scoring.",
        15: "Never align joints is system-specific; retain manufacturer specification and avoid universal prohibition.",
    },
}[N]
cards = []
for i, (source, old) in enumerate(zip(words, archive["cards"], strict=True), 1):
    assert source["en"] == old["en"] and source["kind"] == old["kind"], (N, i)
    note = CARD_HOLDS.get(i)
    cards.append({
        "id": f"master-roofing:{N}:ja-en:card:{i}",
        "legacySourceRef": f"master-roofing:{N}:ja-en:cards:{i}",
        "sourceSpanish": source["es"], "sourceEnglish": source["en"],
        "sourceNoteSpanish": source.get("note"), "kind": source["kind"],
        "selectedJapanese": None, "candidateJapanese": None if note else old["ja"],
        "archivedJapanese": old["ja"], "archivedEnglish": old["en"],
        "reviewNote": note, "reviewed": False,
    })
reader = []
for i, (es, en, old) in enumerate(zip(passage["target"], passage["native"], archive["reader"], strict=True), 1):
    assert en == old["en"], (N, i)
    note = READER_HOLDS.get(i)
    reader.append({
        "id": f"master-roofing:{N}:ja-en:line:{i}",
        "legacySourceRef": f"master-roofing:{N}:ja-en:reader:{i}",
        "sourceSpanish": es, "sourceEnglish": en,
        "selectedJapanese": None, "candidateJapanese": None if note else old["ja"],
        "archivedJapanese": old["ja"], "archivedEnglish": old["en"],
        "reviewNote": note, "reviewed": False,
    })
assert set(archive["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
packet = {
    "schema": 1, "kind": "inert-source-review",
    "pair": {"target": "Japanese", "native": "English"},
    "stageId": "master-roofing", "lessonId": f"master-roofing:{N}:ja-en",
    "source": {key: {"path": path, "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest()}
               for key, path in FILES.items()},
    "sourceEnglishTitle": lesson["title"],
    "sourceEnglishObjective": lesson["objective"],
    "sourceEnglishSpeaking": lesson["steps"][2]["instruction"],
    "sourceSpanishReaderTitle": passage["title"],
    "sourceGrammarFocus": lesson["grammar"]["focus"],
    "sourceGrammarExamples": lesson["grammar"]["examples"],
    "sourceVerbExamples": content["verbs"],
    "candidateObjective": archive["objective"],
    "candidateFocus": archive["focus"],
    "archivedForms": archive["forms"],
    "archivedSpeaking": archive["speaking"],
    "audioScript": None,
    "curriculumAdaptationNote": "Current Spanish/English Master source is pinned as evidence. Archived Japanese wording is conditional candidate evidence only; trade/product/safety and Japanese/dictionary review are pending. The source grammar and verb examples are included for parity, but no selected learner/audio text or saved progress identity is created.",
    "cards": cards, "reader": reader,
    "archivedModeLabels": {mode: {"label": label, "authoredPromptTargetPair": False, "readyForLearner": False}
                           for mode, label in archive["modes"].items()},
    "reviewGates": {key: False for key in ["qualifiedJapanese", "qualifiedRoofing", "dictionarySenses",
                                             "sourceDecision", "audioListening", "learnerRuntime", "scoring",
                                             "offline", "savedProgress", "browserAcceptance", "v4Acceptance"]},
    "reviewed": False, "registered": False, "audioRegistered": False,
}
output = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
path = HERE / "packet.json"
if "--check" in sys.argv:
    assert path.read_text() == output, "packet drifted from source or archived draft"
    print(f"PASS Japanese Roofing Master {N} packet build --check")
else:
    path.write_text(output)
    print(path)
