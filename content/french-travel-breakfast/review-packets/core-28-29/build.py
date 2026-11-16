"""Build inert, source-current French Breakfast Core 28–29 review packets.

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
LESSON_TITLES = ROOT / "src/data/travel-zone.ts"
SOURCE_ENGLISH_TITLES = {28: "Talk with a regular over coffee", 29: "Settle who pays for the group"}
OVERRIDES = HERE / "source-drift-overrides.json"
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
    source_titles = LESSON_TITLES.read_text()
    archive = json.loads(ARCHIVE.read_text())
    override_data = json.loads(OVERRIDES.read_text())
    overrides = override_data["overrides"]
    field_overrides = override_data["lessonFieldOverrides"]
    seen_overrides = set()
    seen_fields = set()
    rows = []
    for n in (28, 29):
        original = source["lessons"][str(n)]
        assert f'"{SOURCE_ENGLISH_TITLES[n]}"' in source_titles
        draft = next(
            x for x in archive["lessons"] if x["stage"] == "core" and x["n"] == n
        )
        assert draft["draftLessonKey"] == f"core:{n}"
        assert len(draft["words"]) == len(original["words"])
        assert len(draft["reader"]) == len(original["passage"]["native"])
        cards = []
        for i, (word, old) in enumerate(zip(original["words"], draft["words"]), 1):
            assert old["id"] == f"core:{n}:word:{i}"
            override = overrides.get(old["id"])
            if override:
                assert old["supportEnglish"] == override["priorEnglish"]
                assert word["en"] == override["sourceEnglish"]
                seen_overrides.add(old["id"])
            else:
                assert old["supportEnglish"] == word["en"]
            cards.append(
                {
                    "id": old["id"],
                    "sourceSpanish": word["es"],
                    "supportEnglish": word["en"],
                    "targetFrenchDraft": override["targetFrenchDraft"] if override else old["targetFrench"],
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
            override = overrides.get(old["id"])
            if override:
                assert old["supportEnglish"] == override["priorEnglish"]
                assert en == override["sourceEnglish"]
                seen_overrides.add(old["id"])
            else:
                assert old["supportEnglish"] == en
            reader.append(
                {
                    "id": old["id"],
                    "sourceSpanish": es,
                    "supportEnglish": en,
                    "targetFrenchDraft": override["targetFrenchDraft"] if override else old["targetFrench"],
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
                "passageTitleSpanish": original["passage"]["title"],
                "lessonTitleEnglish": SOURCE_ENGLISH_TITLES[n],
                "lessonTitlePath": str(LESSON_TITLES.relative_to(ROOT)),
                "lessonTitleSha256": sha(LESSON_TITLES),
            },
            "priorDraft": {
                "path": str(ARCHIVE.relative_to(ROOT)),
                "sha256": sha(ARCHIVE),
            },
            "sourceDriftOverrideSha256": sha(OVERRIDES),
            "overriddenDraftIds": sorted(id for id in seen_overrides if id.startswith(f"core:{n}:")),
            "titleEnglishDraft": draft["titleEnglish"],
            "objectiveEnglishDraft": draft["objectiveEnglish"],
            "focusFrenchDraft": draft["focusFrench"],
            "focusEnglishDraft": draft["focusEnglish"],
            "cards": cards,
            "readerTitleFrenchDraft": draft["readerTitleFrench"],
            "reader": reader,
            "sourceSpanishVerbs": original["verbs"],
            "speakingDraft": dict(draft["speaking"]),
            "modeInputIdsDraft": draft["candidateModeInputs"],
            "gates": FALSE_GATES,
            "reviewNotes": [
                "Archived French text is an unapproved candidate; exact Spanish/English source controls meaning.",
                "Mode ID lists are not six authored prompt/answer activities.",
                "French verb paradigms, dictionary senses, scoring answers, audio and listening need separate review.",
                "Core 28–29 source and French meaning drift is corrected only in the listed draft rows and fields; qualified clinical, emergency, food and locale review remains open.",
            ],
        }
        applied_fields = []
        for field, spec in field_overrides.get(f"core:{n}", {}).items():
            if field in ("focusEnglishDraft", "titleEnglishDraft", "readerTitleFrenchDraft"):
                assert packet[field] == spec["prior"]
                packet[field] = spec["proposed"]
            elif field in ("objectiveEnglishDraft", "focusFrenchDraft"):
                assert packet[field] == spec["prior"]
                packet[field] = spec["proposed"]
            elif field == "speakingDraft.openingFrench":
                assert packet["speakingDraft"]["openingFrench"] == spec["prior"]
                packet["speakingDraft"]["openingFrench"] = spec["proposed"]
            elif field == "speakingDraft.instructionEnglish":
                assert packet["speakingDraft"]["instructionEnglish"] == spec["prior"]
                packet["speakingDraft"]["instructionEnglish"] = spec["proposed"]
            else:
                raise AssertionError(f"Unexpected lesson field override: {field}")
            seen_fields.add((f"core:{n}", field))
            applied_fields.append(field)
        packet["overriddenLessonFields"] = sorted(applied_fields)
        out = HERE / f"core-{n}.json"
        write(out, packet)
        rows.append({"lessonKey": packet["lessonKey"], "path": out.name, "sha256": sha(out)})
    assert seen_overrides == set(overrides), "Unused source-drift override"
    assert seen_fields == {
        (lesson, field)
        for lesson, fields in field_overrides.items()
        for field in fields
    }, "Unused lesson field override"
    write(
        HERE / "manifest.json",
        {
            "sourceSha256": sha(SOURCE),
            "lessonTitleSha256": sha(LESSON_TITLES),
            "priorDraftSha256": sha(ARCHIVE),
            "sourceDriftOverrideSha256": sha(OVERRIDES),
            "packets": rows,
            "status": "source-aligned draft for repository review only",
            "gates": FALSE_GATES,
        },
    )


if __name__ == "__main__":
    build()
