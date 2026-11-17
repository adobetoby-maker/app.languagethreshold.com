#!/usr/bin/env python3
"""Build an inert, source-pinned French Breakfast Master 9 review packet."""
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
GATE_NAMES = (
    "reviewed", "registered", "learnerVisible", "learnerRegistered", "scoringEnabled",
    "audioRegistered", "audioApproved", "listeningReviewed", "playbackEnabled",
    "progressTracking", "progressWritesEnabled", "offlineRegistered", "v4Registered", "released",
)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lesson_sha(course_row, passage_row):
    raw = json.dumps({"course": course_row, "passage": passage_row}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


course = json.loads(COURSE.read_text())["lessons"][8]
passage = json.loads(READER.read_text())["lessons"]["9"]["passage"]
archive = next(x for x in json.loads(ARCHIVE.read_text())["lessons"] if x["n"] == 9)
prior = next(x for x in json.loads(PRIOR.read_text())["lessons"] if x["stage"] == "master" and x["n"] == 9)
candidate = json.loads(CANDIDATE.read_text())
assert course["n"] == 9
assert len(course["words"]) == len(candidate["cardFrenchDrafts"]) == 23
assert len(passage["native"]) == len(passage["target"]) == len(candidate["readerFrenchDrafts"]) == 18

revision = lesson_sha(course, passage)[:12]
cards, reader = [], []
for i, (source, fr) in enumerate(zip(course["words"], candidate["cardFrenchDrafts"]), 1):
    cards.append({
        "id": f"master:9:source-{revision}:word:{i}",
        "legacyDraftId": f"master:9:word:{i}",
        "sourceSpanish": source["es"], "supportEnglish": source["en"],
        "targetFrenchDraft": fr, "kind": source["kind"],
        **({"sourceNoteEnglish": source["note"]} if "note" in source else {}),
    })
for i, (es, en, fr) in enumerate(zip(passage["target"], passage["native"], candidate["readerFrenchDrafts"]), 1):
    reader.append({
        "id": f"master:9:source-{revision}:line:{i}",
        "legacyDraftId": f"master:9:line:{i}",
        "sourceSpanish": es, "supportEnglish": en, "targetFrenchDraft": fr,
    })

modes = []
for mode in ("See", "Recall", "Hear", "Type", "Say", "Write"):
    n = candidate["modeSourceCards"][mode]
    row = cards[n - 1]
    modes.append({
        "mode": mode, "cueEnglish": candidate["modeCuesEnglish"][mode],
        "sourceRef": row["id"], "legacyDraftSourceRef": row["legacyDraftId"],
        "targetFrenchDraft": row["targetFrenchDraft"], "supportEnglish": row["supportEnglish"],
        "recordedAudio": False, "readyForLearner": False,
    })

prior_cards = prior["words"]
prior_reader = prior["reader"]
packet = {
    "schema": "lt.inert-source-review.v1",
    "lessonKey": "master:9", "pair": {"target": "French", "support": "English"},
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
        "oldScene": "Montréal/Camille generic coffee and berry cake rewrite",
        "sourceScene": "Barrio Italia/Camila cortado, raspberry kuchen, cup warmer and chalkboard feedback",
        "matchingPriorEnglishCards": sum(s["en"] == p["supportEnglish"] for s, p in zip(course["words"], prior_cards)),
        "matchingPriorEnglishReaderTurns": sum(s == p["supportEnglish"] for s, p in zip(passage["native"], prior_reader)),
        "disposition": "Archived positions are trace references only; no saved-item or recording migration is authorized.",
    },
    "titleFrenchDraft": candidate["titleFrenchDraft"],
    "focusFrenchDraft": candidate["focusFrenchDraft"],
    "cards": cards, "reader": reader,
    "speakingDraft": candidate["speakingDraft"],
    "formsDraft": candidate["formsDraft"],
    "modeActivitiesDraft": modes,
    "dictionarySensesReviewed": False,
    "reviewNotesEnglish": candidate["reviewQuestionsEnglish"],
    "audioScope": {
        "status": "read-only estimate; no synthesis, technical verification, listening decision, reuse or registration",
        "voices": 2, "selectedFrenchStrings": len(cards) + len(reader),
        "potentialClipDecisions": 2 * (len(cards) + len(reader)),
        "submittedCharacters": sum(len(x["targetFrenchDraft"]) for x in cards + reader),
        "rateUsdPerMillionCharacters": 30,
    },
    "aiAssistance": {
        "currentRun": "Safe-mode Haiku CLI returned Not logged in with empty modelUsage and zero tokens; no AI output was used.",
        "actualModelUsage": {}, "qualifiedApproval": False,
    },
    "gates": {name: False for name in GATE_NAMES},
}
scope = packet["audioScope"]
scope["estimatedGrossUsd"] = round(scope["submittedCharacters"] * 30 / 1_000_000, 6)
out = HERE / "master-9.json"
out.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
manifest = {
    "sourceCourseSha256": sha(COURSE), "sourceReaderSha256": sha(READER),
    "archiveSha256": sha(ARCHIVE), "priorRuntimeSha256": sha(PRIOR),
    "candidateSha256": sha(CANDIDATE), "packetSha256": sha(out),
    "reviewed": False, "registered": False, "audioRegistered": False,
}
(HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(f"Master 9 packet: {len(cards)} cards, {len(reader)} Reader, {scope['potentialClipDecisions']} possible clips")
