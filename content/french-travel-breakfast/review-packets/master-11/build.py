#!/usr/bin/env python3
"""Build an inert source-pinned French Breakfast Master 11 review packet."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
CURRICULUM = ROOT / "src/data/core60/es/master-travel-breakfast.json"
PASSAGES = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"
CANDIDATE = HERE / "candidate-text.json"
GATES = {name: False for name in (
    "reviewed", "registered", "learnerVisible", "learnerRegistered",
    "audioRegistered", "audioApproved", "listeningReviewed", "playbackEnabled",
    "scoringEnabled", "progressTracking", "progressWritesEnabled",
    "offlineRegistered", "released",
)}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def revision_id(kind, n, source_spanish, support_english):
    anchor = hashlib.sha256((source_spanish + "\u0000" + support_english).encode()).hexdigest()[:10]
    return f"master:11:{kind}:{n}:source-{anchor}"


curriculum = next(row for row in json.loads(CURRICULUM.read_text())["lessons"] if row["n"] == 11)
passage = json.loads(PASSAGES.read_text())["lessons"]["11"]["passage"]
archive = next(row for row in json.loads(ARCHIVE.read_text())["lessons"] if row["stage"] == "master" and row["n"] == 11)
candidate = json.loads(CANDIDATE.read_text())
assert len(curriculum["words"]) == len(candidate["cards"]) == len(archive["words"]) == 23
assert len(passage["native"]) == len(passage["target"]) == len(candidate["reader"]) == len(archive["reader"]) == 18

cards = []
for n, (source, face, old) in enumerate(zip(curriculum["words"], candidate["cards"], archive["words"]), 1):
    assert face["i"] == n and old["id"] == f"master:11:word:{n}"
    cards.append({
        "id": revision_id("word", n, source["es"], source["en"]),
        "priorUnregisteredId": old["id"],
        "sourceSpanish": source["es"],
        "supportEnglish": source["en"],
        "targetFrenchDraft": face["targetFrenchDraft"],
        "kind": source["kind"],
    })

reader = []
for n, (es, en, face, old) in enumerate(zip(passage["target"], passage["native"], candidate["reader"], archive["reader"]), 1):
    assert face["i"] == n and old["id"] == f"master:11:line:{n}"
    reader.append({
        "id": revision_id("line", n, es, en),
        "priorUnregisteredId": old["id"],
        "sourceSpanish": es,
        "supportEnglish": en,
        "targetFrenchDraft": face["targetFrenchDraft"],
    })

selected = [row["targetFrenchDraft"] for row in cards + reader]
audio_characters = sum(len(text) for text in selected)
packet = {
    "schema": "lt.inert-source-review.v1",
    "lessonKey": "master:11",
    "pair": {"target": "French", "support": "English"},
    "state": "source-pinned unapproved draft for repository review",
    "source": {
        "curriculumPath": str(CURRICULUM.relative_to(ROOT)),
        "curriculumSha256": digest(CURRICULUM),
        "readerPath": str(PASSAGES.relative_to(ROOT)),
        "readerSha256": digest(PASSAGES),
        "titleEnglish": curriculum["title"],
        "objectiveEnglish": curriculum["objective"],
        "speakingEnglish": curriculum["speaking"],
        "grammarFocusSpanish": curriculum["grammar"]["focus"],
        "readerTitleSpanish": passage["title"],
    },
    "priorDraft": {"path": str(ARCHIVE.relative_to(ROOT)), "sha256": digest(ARCHIVE)},
    "cards": cards,
    "reader": reader,
    "authoredModeActivities": None,
    "speakingDraft": None,
    "formTrainingDraft": None,
    "dictionarySensesReviewed": False,
    "progressIdentity": {
        "stableLessonKey": "master:11",
        "priorRowIds": "archived unregistered candidate only",
        "candidateRowIds": "revision-scoped by exact Spanish and English row meaning",
        "reuseDecision": "blocked pending qualified source/French review and saved-item reconciliation",
        "migration": "none; no runtime or progress import",
    },
    "audioScopeReadOnly": {
        "candidateTextPositions": len(selected),
        "twoVoiceClipDecisions": 2 * len(selected),
        "submittedFrenchCharacters": audio_characters * 2,
        "grossEstimateUsdAt30PerMillionCharacters": round(audio_characters * 2 * 30 / 1_000_000, 5),
        "synthesized": False,
        "listeningReviewed": False,
    },
    "gates": GATES,
}

out = HERE / "master-11.json"
out.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
manifest = {
    "curriculumSha256": digest(CURRICULUM),
    "readerSha256": digest(PASSAGES),
    "priorDraftSha256": digest(ARCHIVE),
    "candidateSha256": digest(CANDIDATE),
    "packetSha256": digest(out),
    "gates": GATES,
}
(HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
