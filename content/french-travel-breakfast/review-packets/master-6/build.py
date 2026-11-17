#!/usr/bin/env python3
"""Build an inert French Breakfast Master 6 candidate from pinned source rows."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
COURSE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/master-4-6-draft.json"
PRIOR = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"
CANDIDATE = HERE / "candidate-reconciled.json"
HISTORICAL_AI = HERE / "historical-ai"
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


course = json.loads(COURSE.read_text())["lessons"][5]
passage = json.loads(READER.read_text())["lessons"]["6"]["passage"]
archive = next(x for x in json.loads(ARCHIVE.read_text())["lessons"] if x["n"] == 6)
prior = next(x for x in json.loads(PRIOR.read_text())["lessons"] if x["stage"] == "master" and x["n"] == 6)
candidate = json.loads(CANDIDATE.read_text())

assert course["n"] == candidate["n"] == 6
assert candidate["stableLessonKey"] == "master:6"
assert candidate["pairKey"] == "fr-en"
assert len(course["words"]) == len(candidate["words"]) == len(prior["words"]) == 23
assert len(passage["native"]) == len(passage["target"]) == len(candidate["reader"]) == len(prior["reader"]) == 18
assert candidate["sourceHashes"]["coreMain"] == sha(COURSE)
assert candidate["sourceHashes"]["readerMain"] == sha(READER)
assert all(candidate[k] is False for k in ("reviewed", "registered", "audioRegistered", "listeningReviewed"))

revision = lesson_sha(course, passage)[:12]
cards, reader, id_map = [], [], {}
for i, (source, draft, old) in enumerate(zip(course["words"], candidate["words"], prior["words"]), 1):
    legacy = f"master:6:word:{i}"
    assert draft["id"] == old["id"] == legacy
    assert draft["en"] == source["en"] and draft["kind"] == source["kind"]
    scoped = f"master:6:source-{revision}:word:{i}"
    id_map[legacy] = scoped
    cards.append({
        "id": scoped, "legacyDraftId": legacy, "sourceSpanish": source["es"],
        "supportEnglish": source["en"], "targetFrenchDraft": draft["fr"], "kind": source["kind"],
        **({"sourceNoteEnglish": source["note"]} if "note" in source else {}),
    })
for i, (es, en, draft, old) in enumerate(zip(passage["target"], passage["native"], candidate["reader"], prior["reader"]), 1):
    legacy = f"master:6:line:{i}"
    assert draft["id"] == old["id"] == legacy
    assert draft["en"] == en
    scoped = f"master:6:source-{revision}:line:{i}"
    id_map[legacy] = scoped
    reader.append({
        "id": scoped, "legacyDraftId": legacy, "sourceSpanish": es,
        "supportEnglish": en, "targetFrenchDraft": draft["fr"],
    })

by_legacy = {row["legacyDraftId"]: row for row in cards + reader}
modes = []
for name in ("See", "Recall", "Hear", "Type", "Say", "Write"):
    item = candidate["modes"][name]
    row = by_legacy[item["sourceRef"]]
    assert item["targetFrench"] == row["targetFrenchDraft"]
    assert item["targetEnglish"] == row["supportEnglish"]
    assert item["recordedAudio"] is False and item["readyForLearner"] is False
    modes.append({
        "mode": name, "cueEnglish": item["cueEnglish"],
        "sourceRef": id_map[item["sourceRef"]], "legacyDraftSourceRef": item["sourceRef"],
        "targetFrenchDraft": item["targetFrench"], "supportEnglish": item["targetEnglish"],
        "recordedAudio": False, "readyForLearner": False,
    })

historical_models = {}
for name in ("haiku-output", "haiku-repair-output", "opus-output", "fable-output"):
    path = HISTORICAL_AI / f"{name}.json"
    output = json.loads(path.read_text())
    assert output["is_error"] is False and output["modelUsage"]
    historical_models[name] = {"file": str(path.relative_to(ROOT)), "sha256": sha(path), "actualModelUsage": list(output["modelUsage"])}

packet = {
    "schema": "lt.inert-source-review.v1",
    "lessonKey": "master:6", "pair": {"target": "French", "support": "English"},
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
        "oldScene": "Brussels café rewrite with different drink/food outcome",
        "sourceScene": "San Telmo confitería: oat-milk delivery, three plant drinks, vegan and lactose-avoiding friends, beef-fat medialunas",
        "matchingPriorEnglishCards": sum(source["en"] == old["supportEnglish"] for source, old in zip(course["words"], prior["words"])),
        "matchingPriorEnglishReaderTurns": sum(en == old["supportEnglish"] for en, old in zip(passage["native"], prior["reader"])),
        "disposition": "The old answer and position scope is retired within this candidate only; no saved-item or audio migration is authorized.",
    },
    "titleFrenchDraft": "Pas de lait d’avoine aujourd’hui : choisir pour le groupe",
    "focusFrenchDraft": "Comparer les boissons disponibles et prévoir la commande jusqu’à l’arrivée de la livraison.",
    "cards": cards, "reader": reader,
    "speakingDraft": candidate["speaking"], "formsDraft": candidate["forms"],
    "modeActivitiesDraft": modes, "dictionarySensesReviewed": False,
    "reviewNotesEnglish": [
        "The old Brussels answer is not source-current; this packet restores San Telmo, Matías, Nora, Hannah and Dev.",
        "Hannah is vegan and chooses soy; Dev avoids lactose and orders lactose-free milk and two beef-fat pastries. The pastry is never described as vegan.",
        "The no-butter/no-milk pastry claim is attributed to the baker; it is not a general ingredient or cross-contact guarantee.",
        "The source-specific lágrima, cortado, medialuna de grasa and confitería senses need qualified French/Argentine food and dictionary review.",
        "French masculine celui follows lait, unlike feminine Spanish la following leche. The earlier Opus/Fable correction and author check preserved that contrast.",
        "All six mode prompt/target pairs, forms and speaking text are review candidates only; Hear has no recording and nothing is learner-scored.",
    ],
    "unresolvedQuestions": candidate["reviewGaps"],
    "audioScope": {
        "status": "read-only estimate; no synthesis, technical verification, listening decision, reuse or registration",
        "voices": 2, "selectedFrenchStrings": len(cards) + len(reader),
        "potentialClipDecisions": 2 * (len(cards) + len(reader)),
        "submittedCharacters": sum(map(len, [c["targetFrenchDraft"] for c in cards] + [r["targetFrenchDraft"] for r in reader])),
        "rateUsdPerMillionCharacters": 30,
    },
    "aiAssistance": {
        "historicalPrivateTeam": historical_models,
        "currentRun": "Safe-mode Haiku CLI returned Not logged in with empty modelUsage; no new AI output was used.",
        "qualifiedApproval": False,
    },
    "gates": {name: False for name in GATE_NAMES},
}
packet["audioScope"]["estimatedGrossUsd"] = round(packet["audioScope"]["submittedCharacters"] * 30 / 1_000_000, 6)
out = HERE / "master-6.json"
out.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
manifest = {
    "sourceCourseSha256": sha(COURSE), "sourceReaderSha256": sha(READER),
    "archiveSha256": sha(ARCHIVE), "priorRuntimeSha256": sha(PRIOR),
    "candidateSha256": sha(CANDIDATE), "packetSha256": sha(out),
    "historicalAiSha256": {name: value["sha256"] for name, value in historical_models.items()},
    "reviewed": False, "registered": False, "audioRegistered": False,
}
(HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
