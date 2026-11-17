#!/usr/bin/env python3
"""Build inert French Breakfast Master 4 source-review evidence."""

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
COURSE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/master-4-6-draft.json"
TEXT = HERE / "candidate-text.json"
GATE_NAMES = (
    "reviewed", "registered", "learnerVisible", "learnerRegistered",
    "audioRegistered", "audioApproved", "listeningReviewed", "playbackEnabled",
    "scoringEnabled", "progressTracking", "progressWritesEnabled",
    "offlineRegistered", "released", "v4Registered",
)
GATES = {key: False for key in GATE_NAMES}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    lesson = json.loads(COURSE.read_text())["lessons"][3]
    passage = json.loads(READER.read_text())["lessons"]["4"]["passage"]
    archive = json.loads(ARCHIVE.read_text())["lessons"][0]
    candidate = json.loads(TEXT.read_text())
    assert lesson["n"] == archive["n"] == 4
    assert len(lesson["words"]) == len(archive["sourceWordsEnglish"]) == len(candidate["cards"]) == 23
    assert len(passage["target"]) == len(passage["native"]) == len(archive["sourcePassageEnglish"]) == len(candidate["reader"]) == 18
    # The archived draft changed card 21 and Reader 11/16. Pin the current
    # source in this packet and preserve the archive only as comparison evidence.
    cards = []
    for n, (source, french) in enumerate(zip(lesson["words"], candidate["cards"]), 1):
        assert isinstance(french, str) and french.strip()
        cards.append({
            "id": f"master:4:source-20261117:word:{n}",
            "priorUnregisteredId": f"master:4:word:{n}",
            "sourceSpanish": source["es"],
            "supportEnglish": source["en"],
            "targetFrenchDraft": french,
            "kind": source["kind"],
        })
    reader = []
    for n, (spanish, english, french) in enumerate(zip(passage["target"], passage["native"], candidate["reader"]), 1):
        assert isinstance(french, str) and french.strip()
        reader.append({
            "id": f"master:4:source-20261117:line:{n}",
            "priorUnregisteredId": f"master:4:line:{n}",
            "sourceSpanish": spanish,
            "supportEnglish": english,
            "targetFrenchDraft": french,
        })
    packet = {
        "schema": "lt.inert-source-review.v1",
        "lessonKey": "master:4",
        "pair": {"target": "French", "support": "English"},
        "stage": "master",
        "source": {
            "coursePath": str(COURSE.relative_to(ROOT)),
            "courseSha256": digest(COURSE),
            "readerPath": str(READER.relative_to(ROOT)),
            "readerSha256": digest(READER),
            "titleEnglish": lesson["title"],
            "objectiveEnglish": lesson["objective"],
            "readerTitleSpanish": passage["title"],
        },
        "priorDraft": {"path": str(ARCHIVE.relative_to(ROOT)), "sha256": digest(ARCHIVE)},
        "cards": cards,
        "reader": reader,
        "modeInputIdsDraft": None,
        "authoredModeActivities": None,
        "formsDraft": None,
        "speakingDraft": None,
        "dictionarySensesDraft": None,
        "progressIdentity": {
            "stableLessonKey": "master:4",
            "candidateRowsRevisionScoped": True,
            "priorUnregisteredRows": "Archived French card 21 and Reader 11/16 change source meanings; no automatic saved-item migration or alias is authorized.",
            "savedItemMigration": "blocked pending exact-pair and qualified review",
        },
        "reviewQuestions": candidate.get("reviewQuestions", []),
        "gates": GATES,
    }
    out = HERE / "master-4.json"
    out.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
    manifest = {
        "state": "source-pinned unapproved candidate",
        "sourceCourseSha256": digest(COURSE),
        "sourceReaderSha256": digest(READER),
        "priorDraftSha256": digest(ARCHIVE),
        "candidateTextSha256": digest(TEXT),
        "packetSha256": digest(out),
        "gates": GATES,
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
