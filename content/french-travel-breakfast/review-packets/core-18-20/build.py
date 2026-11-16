"""Build inert, source-current French Breakfast Core 18–20 review packets.

The archived French draft is a translation candidate. Spanish source order and
English meanings are authoritative; this script fails on drift instead of
silently changing a lesson or its saved-item identity.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
ARCHIVE = (
    ROOT
    / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"
)
FALSE_GATES = {
    key: False
    for key in (
        "reviewed",
        "registered",
        "learnerVisible",
        "learnerRegistered",
        "audioRegistered",
        "audioApproved",
        "listeningReviewed",
        "playbackEnabled",
        "scoringEnabled",
        "progressTracking",
        "progressWritesEnabled",
        "offlineRegistered",
        "released",
    )
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def build() -> None:
    source = json.loads(SOURCE.read_text())
    archive = json.loads(ARCHIVE.read_text())
    rows = []
    for n in (18, 19, 20):
        original = source["lessons"][str(n)]
        draft = next(
            x for x in archive["lessons"] if x["stage"] == "core" and x["n"] == n
        )
        assert draft["draftLessonKey"] == f"core:{n}"
        assert len(draft["words"]) == len(original["words"])
        assert len(draft["reader"]) == len(original["passage"]["native"])
        cards = []
        for i, (word, old) in enumerate(zip(original["words"], draft["words"]), 1):
            assert old["id"] == f"core:{n}:word:{i}"
            assert old["supportEnglish"] == word["en"]
            cards.append(
                {
                    "id": old["id"],
                    "sourceSpanish": word["es"],
                    "supportEnglish": word["en"],
                    "targetFrenchDraft": old["targetFrench"],
                    "kind": word["kind"],
                }
            )
        reader = []
        for i, (es, en, old) in enumerate(
            zip(
                original["passage"]["target"],
                original["passage"]["native"],
                draft["reader"],
            ),
            1,
        ):
            assert old["id"] == f"core:{n}:line:{i}"
            assert old["supportEnglish"] == en
            reader.append(
                {
                    "id": old["id"],
                    "sourceSpanish": es,
                    "supportEnglish": en,
                    "targetFrenchDraft": old["targetFrench"],
                }
            )
        packet = {
            "lessonKey": f"core:{n}",
            "pair": {"target": "French", "support": "English"},
            "source": {
                "path": str(SOURCE.relative_to(ROOT)),
                "sha256": sha(SOURCE),
                "stage": "core",
                "number": n,
            },
            "priorDraft": {
                "path": str(ARCHIVE.relative_to(ROOT)),
                "sha256": sha(ARCHIVE),
            },
            "titleEnglishDraft": draft["titleEnglish"],
            "objectiveEnglishDraft": draft["objectiveEnglish"],
            "focusFrenchDraft": draft["focusFrench"],
            "focusEnglishDraft": draft["focusEnglish"],
            "cards": cards,
            "readerTitleFrenchDraft": draft["readerTitleFrench"],
            "reader": reader,
            "sourceSpanishVerbs": original["verbs"],
            "speakingDraft": draft["speaking"],
            "modeInputIdsDraft": draft["candidateModeInputs"],
            "gates": FALSE_GATES,
            "reviewNotes": [
                "Archived French text is an unapproved candidate; exact Spanish/English source controls meaning.",
                "Mode ID lists are not six authored prompt/answer activities.",
                "French verb paradigms, dictionary senses, scoring answers, audio and listening need separate review.",
            ],
        }
        out = HERE / f"core-{n}.json"
        write(out, packet)
        rows.append({"lessonKey": packet["lessonKey"], "path": out.name, "sha256": sha(out)})
    write(
        HERE / "manifest.json",
        {
            "sourceSha256": sha(SOURCE),
            "priorDraftSha256": sha(ARCHIVE),
            "packets": rows,
            "status": "source-aligned draft for repository review only",
            "gates": FALSE_GATES,
        },
    )


if __name__ == "__main__":
    build()
