"""Build inert Foundation 2/8 correction proposals against pinned source and draft."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CURRICULUM = ROOT / "src/data/core60/es/foundation-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/foundation-travel-breakfast.json"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/foundation-1-10-draft.json"
OUT = HERE / "source-correction-proposals.json"
FALSE_GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled",
    "audioRegistered", "listeningReviewed", "offlineRegistered",
    "progressWritesEnabled", "released",
)}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    source = json.loads(CURRICULUM.read_text())["lessons"]
    reader = json.loads(READER.read_text())["lessons"]
    archive = json.loads(DRAFT.read_text())
    assert archive["reviewed"] is False and archive["registered"] is False
    old = archive["lessons"]
    assert old[1]["stableId"] == "foundation-travel-breakfast:2:ja-en"
    assert old[7]["stableId"] == "foundation-travel-breakfast:8:ja-en"
    assert old[1]["cards"][10] == {"ja": "八時半", "en": "half past eight", "kind": "term"}
    assert old[7]["reader"][3]["en"] == "I do not eat meat. Do you have a dish without meat?"
    assert old[7]["reader"][4]["en"] == "I will check. Please wait a moment."
    assert source[1]["objective"] == old[1]["sourceEnglishObjective"]
    assert source[7]["objective"] == old[7]["sourceEnglishObjective"]
    assert reader["2"]["passage"]["native"][1] == "Emma looks at the time: It's half past 8."
    assert reader["8"]["passage"]["native"][4] == "Tom: I never eat peanuts, I'm allergic."
    assert reader["8"]["passage"]["native"][5] == "Luis: I'm going to ask the kitchen if they use nuts or peanuts."
    return {
        "schema": 1,
        "pairKey": "Japanese:English",
        "track": "travel-breakfast",
        "stage": "foundation",
        "sourceCurriculumSha256": sha(CURRICULUM),
        "sourceReaderSha256": sha(READER),
        "archivedDraftSha256": sha(DRAFT),
        "status": "source-only correction proposals; no runtime import or progress migration",
        "gates": FALSE_GATES,
        "proposals": [
            {
                "lessonKey": "foundation:2",
                "stableLessonId": old[1]["stableId"],
                "sourceObjective": source[1]["objective"],
                "sourceReaderAnchor": {"position": 2, "english": reader["2"]["passage"]["native"][1]},
                "existingCardAnchor": {"position": 11, **old[1]["cards"][10]},
                "readerPositionIndexBase": 1,
                "readerAdditionBeforeOldPosition": 1,
                "newReaderCandidate": {
                    "id": "foundation-travel-breakfast:2:reader:clock-time-v1",
                    "speaker": "Narrator",
                    "ja": "サムは時計を見ます。今、八時半です。",
                    "en": "Sam looks at the clock. It is half past eight now.",
                },
                "speakingGoalAddition": "Use the half-past-eight clock cue in the scene, then order and confirm the stated total.",
                "legacyReaderPositionPlan": [
                    {"old": i, "candidate": i + 1} for i in range(1, 10)
                ],
                "identityNote": "Old Reader positions have no explicit row IDs. The new scene-setting turn has position 1 and a new ID; the listed old-to-candidate positions are a review plan, not an authorized progress migration. The archived course was unregistered, so no shipped saved positions are known.",
                "audioNote": "A new exact-text turn needs new audio and a distinct listening decision.",
            },
            {
                "lessonKey": "foundation:8",
                "stableLessonId": old[7]["stableId"],
                "sourceObjective": source[7]["objective"],
                "sourceReaderAnchors": [
                    {"position": 5, "english": reader["8"]["passage"]["native"][4]},
                    {"position": 6, "english": reader["8"]["passage"]["native"][5]},
                ],
                "existingReaderAnchors": [
                    {"position": 4, **old[7]["reader"][3]},
                    {"position": 5, **old[7]["reader"][4]},
                ],
                "newCardCandidates": [
                    {"id": "foundation-travel-breakfast:8:card:peanuts-v1", "ja": "ピーナッツ", "en": "peanuts", "kind": "term"},
                    {"id": "foundation-travel-breakfast:8:card:peanut-allergy-v1", "ja": "ピーナッツアレルギーがあります", "en": "I have a peanut allergy", "kind": "phrase"},
                    {"id": "foundation-travel-breakfast:8:card:cannot-eat-peanuts-v1", "ja": "ピーナッツは絶対に食べられません", "en": "I cannot eat peanuts at all", "kind": "phrase"},
                ],
                "newCardsPlacement": "Append after all 12 old cards; retain old positions 1–12.",
                "sceneAddition": "Sam's companion states the peanut allergy; Sam's meat avoidance stays a separate statement.",
                "readerPositionIndexBase": 1,
                "readerAdditionAfterOldPosition": 4,
                "newReaderCandidate": {
                    "id": "foundation-travel-breakfast:8:reader:peanut-allergy-v1",
                    "speaker": "Companion",
                    "ja": "ピーナッツは絶対に食べられません。ピーナッツアレルギーがあります。",
                    "en": "I cannot eat peanuts at all. I have a peanut allergy.",
                },
                "existingReaderPosition5ReplacementCandidate": {
                    "id": "foundation-travel-breakfast:8:reader:kitchen-check-v1",
                    "speaker": "Staff",
                    "ja": "ピーナッツやナッツ類を使っているか、調理場に確認します。少々お待ちください。",
                    "en": "I will check with the kitchen whether they use nuts or peanuts. Please wait a moment.",
                },
                "speakingGoalAddition": "State the companion's peanut allergy separately from Sam's meat avoidance, and ask staff to check with the kitchen whether nuts or peanuts are used.",
                "legacyReaderPositionPlan": [
                    {"old": i, "candidate": i if i < 5 else (None if i == 5 else i + 1),
                     "disposition": "retire old generic check; new specific staff turn at candidate position 6" if i == 5 else "preserve meaning at mapped position"}
                    for i in range(1, 10)
                ],
                "identityNote": "The allergy turn is candidate position 5 with a new ID. Retire generic old turn 5 rather than treating its specific replacement as the same saved item; the new kitchen-check turn is candidate position 6 with a new ID. The listed old-to-candidate positions are a review plan, not an authorized progress migration. The archived course was unregistered, so no shipped saved positions are known.",
                "audioNote": "The added turn and changed staff turn need exact-text audio and distinct listening decisions.",
            },
        ],
        "unresolved": [
            "Qualified Japanese, food and allergy terminology review is required; dietary preference must stay distinct from allergy.",
            "The Spanish source names Tom as the allergic diner. The older Japanese scene names only Sam; qualified review must approve the added companion and scene continuity.",
            "Foundation 8's source also states that Tom does not eat dairy; the old Japanese scene omits that separate statement.",
            "Foundation 4 fresh versus freshly squeezed juice and Foundation 9 payment/tip locale choices need separate review.",
            "The archived draft supplies prose mode labels, not six authored prompt/answer activities; dictionary, forms, speaking and saved-item mapping remain open.",
            "The original meat-free dish question has no confirmed food answer in this short scene; the kitchen-check reply is not a claim of allergen safety.",
        ],
    }


def main():
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.read_text() == rendered, "proposal is stale"
        print("PASS Japanese Breakfast Foundation 2/8 source proposals and closed gates")
    else:
        OUT.write_text(rendered)


if __name__ == "__main__":
    main()
