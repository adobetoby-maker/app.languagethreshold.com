#!/usr/bin/env python3
"""Check the exact source pin and closed gates for this inert review record."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
RECORD = Path(__file__).with_name("decision-record.json")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def main() -> None:
    record = json.loads(RECORD.read_text(encoding="utf-8"))
    require(record["schema"] == 1, "schema changed")
    require(record["pairKey"] == "French:English", "exact pair changed")
    require(record["stableLessonKey"] == "foundation:5", "lesson identity changed")
    require(record["selectedAnswer"] is None, "an answer was selected")
    require(all(value is False for value in record["gates"].values()), "a gate opened")

    source = record["source"]
    source_path = ROOT / source["lessonPath"]
    packet_path = ROOT / source["existingPacketPath"]
    require(sha256(source_path) == source["lessonSha256"], "Spanish course source drifted")
    require(sha256(packet_path) == source["existingPacketSha256"], "archived French packet drifted")

    course = json.loads(source_path.read_text(encoding="utf-8"))
    lesson = next(x for x in course["lessons"] if x["n"] == 5)
    source_card = lesson["words"][14]
    row = record["row"]
    require(row["rowId"] == "foundation:5:word:15" and row["position"] == 15, "card ID changed")
    require(source_card["es"] == row["sourceSpanish"], "Spanish face drifted")
    require(source_card["en"] == row["sourceEnglish"], "English face drifted")
    require(source_card["note"] == row["sourceNote"], "source sense note drifted")
    require(source_card["kind"] == row["kind"] == "phrase", "card kind drifted")

    packet = json.loads(packet_path.read_text(encoding="utf-8"))
    require(packet["stableLessonKey"] == record["stableLessonKey"], "archived lesson ID changed")
    archived_card = packet["cards"][14]
    require(archived_card["id"] == row["rowId"], "archived card ID changed")
    require(archived_card["spanishSource"] == row["sourceSpanish"], "archived Spanish changed")
    require(archived_card["english"] == row["sourceEnglish"], "archived English changed")
    require(archived_card["french"] == row["archivedFrenchCandidateUnapproved"], "archived French changed")
    require(not any(x["english"] == row["sourceEnglish"] for x in packet["reader"]), "Reader claim drifted")
    require(row["readerContainsThisQuestion"] is False, "Reader claim changed")
    require(packet["frenchVerbParadigmsAuthored"] is False, "verb-paradigm gap changed")
    for gate in (
        "reviewed", "registered", "audioRegistered", "audioListeningReviewed",
        "readyForLearner", "learnerRuntimeEnabled", "audioPlaybackEnabled", "progressEnabled",
    ):
        require(packet[gate] is False, f"archived {gate} gate opened")

    alternatives = row["alternativesNotSelected"]
    require(len(alternatives) == 2, "need both conditional senses")
    require(len({x["french"] for x in alternatives}) == 2, "alternatives collapsed")
    require(all(x["literalEnglishGloss"] and x["sourceChangeNeeded"] for x in alternatives), "alternative lacks context")
    require(len(row["qualifiedReviewQuestions"]) == 3, "review decisions missing")
    print("PASS French Breakfast Foundation 5: source card 15 conflict pinned, no selected answer, closed gates")


if __name__ == "__main__":
    main()
