#!/usr/bin/env python3
"""Build inert French Breakfast Master 1 source-review evidence."""

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
COURSE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/master-1-3-draft.json"
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
    lesson = json.loads(COURSE.read_text())["lessons"][0]
    passage = json.loads(READER.read_text())["lessons"]["1"]["passage"]
    archive = json.loads(ARCHIVE.read_text())["lessons"][0]
    candidate = json.loads(TEXT.read_text())
    assert lesson["n"] == archive["n"] == 1
    assert len(lesson["words"]) == len(archive["sourceWordsEnglish"]) == len(candidate["cards"]) == 22
    assert len(passage["target"]) == len(passage["native"]) == len(archive["sourcePassageEnglish"]) == len(candidate["reader"]) == 18
    assert [x["en"] for x in lesson["words"]] == [x["en"] for x in archive["sourceWordsEnglish"]]
    assert passage["native"] == archive["sourcePassageEnglish"]
    cards = []
    for n, (source, french) in enumerate(zip(lesson["words"], candidate["cards"]), 1):
        assert isinstance(french, str) and french.strip()
        cards.append({
            "id": f"master:1:source-20261116:word:{n}",
            "priorUnregisteredId": f"master:1:word:{n}",
            "sourceSpanish": source["es"],
            "supportEnglish": source["en"],
            "targetFrenchDraft": french,
            "kind": source["kind"],
        })
    reader = []
    for n, (spanish, english, french) in enumerate(zip(passage["target"], passage["native"], candidate["reader"]), 1):
        assert isinstance(french, str) and french.strip()
        reader.append({
            "id": f"master:1:source-20261116:line:{n}",
            "priorUnregisteredId": f"master:1:line:{n}",
            "sourceSpanish": spanish,
            "supportEnglish": english,
            "targetFrenchDraft": french,
        })
    packet = {
        "schema": "lt.inert-source-review.v1",
        "lessonKey": "master:1",
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
            "stableLessonKey": "master:1",
            "candidateRowsRevisionScoped": True,
            "priorUnregisteredRows": "Archived French rows change source meanings; no automatic saved-item migration or alias is authorized.",
            "savedItemMigration": "blocked pending exact-pair and qualified review",
        },
        "reviewQuestions": candidate.get("reviewQuestions", []),
        "gates": GATES,
    }
    out = HERE / "master-1.json"
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
