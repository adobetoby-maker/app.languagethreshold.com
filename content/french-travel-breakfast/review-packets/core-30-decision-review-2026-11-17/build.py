#!/usr/bin/env python3
"""Build a closed-gate decision record; never import it into lesson runtime."""
import argparse
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
PACKET = ROOT / "content/french-travel-breakfast/review-packets/core-30/core-30.json"
OUTPUT = HERE / "decision.json"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def make_record():
    source = json.loads(SOURCE.read_text(encoding="utf-8"))["lessons"]["30"]
    packet = json.loads(PACKET.read_text(encoding="utf-8"))
    conflict = packet["unresolvedConflict"]
    alt = conflict["unmergedAlternativeSource"]
    assert conflict["id"] == "core:30:line:4"
    assert source["passage"]["target"][3] == conflict["currentSourceSpanish"]
    assert source["passage"]["native"][3] == conflict["currentSupportEnglish"]
    assert packet["reader"][3]["targetFrenchDraft"] is None
    assert conflict["selectedFrenchAnswer"] is None
    assert conflict["selectedWritePrompt"] is None
    assert conflict["selectedWriteTarget"] is None
    assert all(value is False for value in packet["gates"].values())
    return {
        "schema": "lt.inert-breakfast-source-decision.v1",
        "lessonKey": "core:30",
        "pair": {"target": "French", "support": "English"},
        "source": {"path": str(SOURCE.relative_to(ROOT)), "sha256": digest(SOURCE)},
        "existingPacket": {"path": str(PACKET.relative_to(ROOT)), "sha256": digest(PACKET)},
        "sourceRevisionSelection": None,
        "selectedFrenchAnswer": None,
        "selectedWritePrompt": None,
        "selectedWriteTarget": None,
        "conditionalBranchesNotSelected": [
            {
                "branch": "retain current main source",
                "sourceRevision": "main source hash above",
                "sourceSpanish": conflict["currentSourceSpanish"],
                "supportEnglish": conflict["currentSupportEnglish"],
                "frenchCandidateNotSelected": "Le serveur se renseigne auprès de la cuisine et nous recommande le menu enfant avec des œufs brouillés, parce que le cuisinier dit qu’il ne contient pas de fruits à coque.",
                "literalEnglishGloss": "The waiter asks in the kitchen and recommends the kids' menu with scrambled eggs because the cook says that it contains no nuts.",
                "reviewBoundary": "This attributes an ingredient claim to the cook. It does not establish ingredient verification, preparation controls or cross-contact safety for the daughter.",
            },
            {
                "branch": "adopt separately authored source correction",
                "sourceRevision": alt["commit"],
                "sourceFileSha256": alt["sha256"],
                "sourceSpanish": alt["sourceSpanish"],
                "supportEnglish": alt["supportEnglish"],
                "frenchCandidateNotSelected": conflict["archivedTargetFrench"],
                "literalEnglishGloss": alt["supportEnglish"],
                "reviewBoundary": "This is an archived French candidate for a different source outcome. A qualified reviewer must confirm contact croisé terminology, food handling and whether surrounding Reader turns still align.",
            },
        ],
        "alignedDependencies": {
            "heldReaderId": "core:30:line:4",
            "dependentCardIds": ["core:30:word:4", "core:30:word:5"],
            "contextReaderIds": ["core:30:line:3", "core:30:line:5"],
            "modeInputIdsAreOnlyLists": ["see", "recall", "hear", "type", "say", "write"],
            "authoredModePromptTargets": None,
            "writeActivityId": None,
            "writePrompt": None,
            "writeTarget": None,
            "speakingActivity": None,
            "revisionScopedRowIds": None,
            "savedReaderAndWriteMigration": "blocked pending source, ID and account-progress review",
        },
        "qualifiedReviewQuestionsInternal": [
            "Which Spanish/English Reader 4 outcome is intended: the cook's no-nuts report or the inability to rule out cross-contact and use of brought food?",
            "If the correction is chosen, should Reader 5 say which family members eat café food, and do kids' menu/scrambled-eggs cards remain lesson objectives?",
            "Does the French allergy vocabulary preserve the intended clinical meaning and the cook/kitchen attribution without implying cross-contact safety?",
            "After source selection, what new Reader 4, dependent cards, six authored prompt/target pairs, Write response, speaking objective and exact-text audio should share the revision?",
            "How will old Reader, card and Write saved items be reconciled without silently reusing a changed outcome?",
        ],
        "gates": packet["gates"],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(make_record(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text(encoding="utf-8") == rendered, "decision record drift"
        print("Core 30 decision record build --check PASS")
    else:
        OUTPUT.write_text(rendered, encoding="utf-8")
        print("Core 30 decision record built")


if __name__ == "__main__":
    main()
