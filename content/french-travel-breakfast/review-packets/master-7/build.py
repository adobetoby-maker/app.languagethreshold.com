#!/usr/bin/env python3
"""Build the inert French Breakfast Master 7 source review packet."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
COURSE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/master-7-9-draft.json"
PRIOR = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"
CANDIDATE = HERE / "candidate-text.json"
GATES = (
    "reviewed", "registered", "learnerVisible", "learnerRegistered", "scoringEnabled",
    "audioRegistered", "audioApproved", "listeningReviewed", "playbackEnabled",
    "progressTracking", "progressWritesEnabled", "offlineRegistered", "v4Registered", "released",
)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lesson_sha(course, passage):
    raw = json.dumps({"course": course, "passage": passage}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


course = json.loads(COURSE.read_text())["lessons"][6]
passage = json.loads(READER.read_text())["lessons"]["7"]["passage"]
archive = next(x for x in json.loads(ARCHIVE.read_text())["lessons"] if x["n"] == 7)
prior = next(x for x in json.loads(PRIOR.read_text())["lessons"] if x["stage"] == "master" and x["n"] == 7)
candidate = json.loads(CANDIDATE.read_text())
assert course["n"] == 7 and len(course["words"]) == len(candidate["cardsFrench"]) == len(prior["words"]) == 23
assert len(passage["target"]) == len(passage["native"]) == len(candidate["readerFrench"]) == len(prior["reader"]) == 18
revision = lesson_sha(course, passage)[:12]

cards, reader = [], []
for i, (source, french, old) in enumerate(zip(course["words"], candidate["cardsFrench"], prior["words"]), 1):
    assert old["id"] == f"master:7:word:{i}"
    cards.append({
        "id": f"master:7:source-{revision}:word:{i}",
        "legacyDraftId": old["id"], "sourceSpanish": source["es"],
        "supportEnglish": source["en"], "targetFrenchDraft": french, "kind": source["kind"],
        **({"sourceNoteEnglish": source["note"]} if "note" in source else {}),
    })
for i, (es, en, french, old) in enumerate(zip(passage["target"], passage["native"], candidate["readerFrench"], prior["reader"]), 1):
    assert old["id"] == f"master:7:line:{i}"
    reader.append({
        "id": f"master:7:source-{revision}:line:{i}",
        "legacyDraftId": old["id"], "sourceSpanish": es,
        "supportEnglish": en, "targetFrenchDraft": french,
    })

modes = []
for choice in candidate["modeChoices"]:
    row = (cards if choice["kind"] == "card" else reader)[choice["index"] - 1]
    modes.append({
        "mode": choice["mode"], "cueEnglish": choice["cueEnglish"],
        "sourceRef": row["id"], "targetFrenchDraft": row["targetFrenchDraft"],
        "supportEnglish": row["supportEnglish"],
        "recordedAudio": False, "readyForLearner": False,
    })

scope = {
    "status": "read-only estimate; no synthesis, technical verification, listening decision, reuse or registration",
    "voices": 2, "selectedFrenchStrings": len(cards) + len(reader),
    "potentialClipDecisions": 2 * (len(cards) + len(reader)),
    "submittedCharacters": sum(len(x["targetFrenchDraft"]) for x in cards + reader),
    "rateUsdPerMillionCharacters": 30,
}
scope["estimatedGrossUsd"] = round(scope["submittedCharacters"] * 30 / 1_000_000, 6)
packet = {
    "schema": "lt.inert-source-review.v1",
    "lessonKey": "master:7", "pair": {"target": "French", "support": "English"},
    "source": {
        "coursePath": str(COURSE.relative_to(ROOT)), "courseSha256": sha(COURSE),
        "readerPath": str(READER.relative_to(ROOT)), "readerSha256": sha(READER),
        "lessonSha256": lesson_sha(course, passage),
        "titleEnglish": course["title"], "objectiveEnglish": course["objective"],
        "speakingEnglish": course["speaking"], "sourceGrammar": course["grammar"],
        "passageTitleSpanish": passage["title"],
    },
    "priorDraft": {
        "archivePath": str(ARCHIVE.relative_to(ROOT)), "archiveSha256": sha(ARCHIVE),
        "runtimePath": str(PRIOR.relative_to(ROOT)), "runtimeSha256": sha(PRIOR),
        "oldScene": "Québec farm café, toast and juice substituted for Salento's arepas, tintos and aguapanelas",
        "sourceScene": "Salento coffee farm, moved minibus departure, exact Colombian food counts and 64,000-peso Nequi transfer",
        "matchingPriorEnglishCards": sum(source["en"] == old["supportEnglish"] for source, old in zip(course["words"], prior["words"])),
        "matchingPriorEnglishReaderTurns": sum(en == old["supportEnglish"] for en, old in zip(passage["native"], prior["reader"])),
        "disposition": "Legacy IDs and positions are trace evidence only; no automatic saved-item or audio migration is authorized.",
    },
    "titleFrenchDraft": candidate["titleFrenchDraft"], "focusFrenchDraft": candidate["focusFrenchDraft"],
    "cards": cards, "reader": reader,
    "formsDraft": candidate["formsDraft"], "speakingDraft": candidate["speakingDraft"],
    "modeActivitiesDraft": modes, "dictionarySensesReviewed": False,
    "reviewNotesEnglish": [
        "The old Québec scene is not current source; this packet restores Salento, Emma, Andrés and Doña Marleny.",
        "The source states 7:30 breakfast completion, 7:45 departure and an in-dialogue ten-minute warning; those times are retained, not silently reconciled.",
        "The source's 64,000-peso balance is recorded as a source assertion, not recalculated from missing unit prices.",
        "Nequi is named by the source. Whether bank transfer, app transfer or another French description best fits Colombian usage needs qualified locale review.",
        "Food terms are taught directly with explanatory French glosses; qualified Colombian food and dictionary review remains open.",
        "All six cue/target mode pairs, forms and speaking are review candidates. Hear has no recording and no answer is learner-scored.",
    ],
    "unresolvedQuestions": [
        "Qualified French/Colombian-food review of tinto, arepa, huevos pericos, aguapanela, calentado and queso campesino in context.",
        "Qualified locale review of Nequi as a payment method and the source's three time statements.",
        "Dictionary senses and saved-item mapping between the old Québec answer and the current source scene.",
    ],
    "audioScope": scope,
    "aiAssistance": {
        "currentRun": "Safe-mode Haiku 5.5 CLI returned Not logged in, zero tokens and empty modelUsage. No Opus/Fable call or AI output was used.",
        "actualModelUsage": {}, "qualifiedApproval": False,
    },
    "gates": {name: False for name in GATES},
}
out = HERE / "master-7.json"
out.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
manifest = {
    "sourceCourseSha256": sha(COURSE), "sourceReaderSha256": sha(READER),
    "archiveSha256": sha(ARCHIVE), "priorRuntimeSha256": sha(PRIOR),
    "candidateSha256": sha(CANDIDATE), "packetSha256": sha(out),
    "reviewed": False, "registered": False, "audioRegistered": False,
}
(HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
