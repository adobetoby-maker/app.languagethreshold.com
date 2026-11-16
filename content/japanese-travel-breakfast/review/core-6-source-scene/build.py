"""Build the inert Japanese Breakfast Core 6 source-scene review packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
OBJECTIVES = ROOT / "src/data/travel-zone.ts"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/core-1-30-draft.json"
OUT = HERE / "source-setting-candidate.json"
PINNED_HASHES = {
    SOURCE: "8c00629a79532821ac7b554a4e0f828b25372500303b3dc70f9568c5aabb34cc",
    OBJECTIVES: "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8",
    DRAFT: "7a6ed4b3869c3599119ae74ea911f6c881bf87294342a060378a5a3f19de6112",
}

STABLE = "travel-breakfast:6:ja-en"
REVISION = STABLE + ":source-scene-v1"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled",
    "audioRegistered", "listeningReviewed", "offlineRegistered",
    "progressWritesEnabled", "released", "runtimeImported",
    "ownerRouteEnabled", "v4Imported",
)}

CARDS = [
    "アレルギー", "ナッツ", "ピーナッツ", "乳製品", "グルテン", "肉", "材料",
    "パン", "バター", "店員", "ナッツアレルギーがあります。", "これにはどんな材料が使われていますか。",
    "肉は食べません。", "厨房に確認していただけますか。", "乳製品は避けたいです。",
    "このパンにはグルテンが入っていますか。",
]
CARD_GLOSSES = [
    "allergy", "nuts", "peanuts", "dairy products", "gluten", "meat",
    "ingredients", "bread", "butter", "shop staff member",
    "I have a nut allergy.", "What ingredients are used in this?", "I do not eat meat.",
    "Could you check with the kitchen?", "I would like to avoid dairy products.",
    "Does this bread contain gluten?",
]
READER_JA = [
    "カフェで、注文する前に店員に声をかけます。",
    "まず「ナッツアレルギーがあります」と伝えます。",
    "次に「これにはどんな材料が使われていますか」と尋ねます。",
    "店員ははっきり分からないので、厨房に確認します。",
    "その後、店員は厨房の話ではパンにナッツは入っていないと教えてくれます。",
    "また「肉は食べません」と伝え、中身に肉が入っているかどうか尋ねます。",
    "厨房で確認してもはっきりしない場合は、別のものを注文します。",
    None,
]
READER_GLOSSES = [
    "At a café I speak to a staff member before ordering.",
    "First I say: I have a nut allergy.",
    "Next I ask: What ingredients are used in this?",
    "The staff member is not sure, so checks with the kitchen.",
    "Later the staff member tells me that, according to the kitchen, the bread contains no nuts.",
    "I also say that I do not eat meat and ask whether the filling contains meat.",
    "If a kitchen check does not settle the question, I order something else.",
    None,
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render():
    if any(sha(path) != expected for path, expected in PINNED_HASHES.items()):
        raise ValueError("pinned source drift")
    source_file = json.loads(SOURCE.read_text(encoding="utf-8"))
    source = source_file["lessons"]["6"]
    archived = json.loads(DRAFT.read_text(encoding="utf-8"))
    old = archived["lessons"][5]
    assert old["n"] == 6 and old["stableId"] == STABLE
    assert archived["reviewed"] is False and archived["registered"] is False
    assert len(source["words"]) == len(CARDS) == len(CARD_GLOSSES) == 16
    passage = source["passage"]
    assert len(passage["target"]) == len(passage["native"]) == len(READER_JA) == len(READER_GLOSSES) == 8
    objective = old["sourceEnglish"]
    objectives_text = OBJECTIVES.read_text(encoding="utf-8")
    title_at = objectives_text.index('"Explain a breakfast restriction"')
    objective_at = objectives_text.index('"' + objective["objective"] + '"')
    roleplay_at = objectives_text.index('"' + objective["roleplay"] + '"')
    if not (0 < objective_at - title_at < 250 and 0 < roleplay_at - objective_at < 500):
        raise ValueError("title, objective and roleplay pairing drift")
    cards = [
        {"id": f"{REVISION}:card:{i:02d}", "candidatePosition": i,
         "sourceSpanish": row["es"], "sourceEnglish": row["en"],
         "kind": row["kind"], "sourceNoteInternal": row.get("note"),
         "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False}
        for i, (row, ja, gloss) in enumerate(zip(source["words"], CARDS, CARD_GLOSSES), 1)
    ]
    reader = [
        {"id": f"{REVISION}:reader:{i:02d}", "candidatePosition": i,
         "speaker": "Narrator", "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False,
         "selectionStatus": "withheld for source editorial review" if ja is None else "unapproved draft candidate"}
        for i, (es, en, ja, gloss) in enumerate(zip(
            passage["target"], passage["native"], READER_JA, READER_GLOSSES), 1)
    ]
    draft_faces = [r for r in cards + reader if r["targetJapaneseDraft"]]
    overlaps = [
        {"oldPosition": oi, "candidatePosition": ni, "migrationAuthorized": False,
         "textOnly": True}
        for oi, old_row in enumerate(old["cards"], 1)
        for ni, new_row in enumerate(cards, 1)
        if old_row["ja"] == new_row["targetJapaneseDraft"]
    ]
    if any("id" in row for row in old["cards"] + old["reader"]):
        raise ValueError("archived row ID assumption changed")
    old_ids = {row["id"] for row in old["cards"] + old["reader"] if "id" in row}
    new_ids = {row["id"] for row in cards + reader}
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
        "stage": "core", "lessonKey": "core:6", "stableLessonId": STABLE,
        "candidateRevision": REVISION, "status": "source-only Japanese candidate; unapproved",
        "reviewed": False,
        "source": {"contentPath": str(SOURCE.relative_to(ROOT)), "contentSha256": sha(SOURCE),
                   "objectivesPath": str(OBJECTIVES.relative_to(ROOT)), "objectivesSha256": sha(OBJECTIVES),
                   "sourceVersion": source_file["version"],
                   "sourceReviewed": source_file["reviewed"],
                   "sourceModelClaim": source_file.get("model"),
                   "titleEnglishInternal": "Explain a breakfast restriction",
                   "objectiveEnglishInternal": objective["objective"],
                   "objectiveEditorialHold": True,
                   "roleplayEnglishInternal": objective["roleplay"],
                   "readerTitleSpanish": passage["title"],
                   "readerVerbExamples": [v["example"] for v in source["verbs"]]},
        "archivedDraft": {"path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "State an allergy or dietary need directly, ask staff about ingredients and request a kitchen check using polite Japanese.",
        "speakingGoalInternal": objective["roleplay"],
        "sourceConflictInternal": "The unreviewed Spanish source objective and Reader 8 insert a generic no-medical-advice line. That line is kept as pinned source evidence but has no Japanese learner face pending source editorial review. The archived Japanese draft instead adds a companion, shared cooking utensils and handling uncertainty; these facts are not in Core 6 source and belong to a separate cross-contact lesson. Source Reader 3 has no explicit ingredient referent, Reader 5 introduces bread without an earlier mention, and Reader 5 reports only that the kitchen says the bread contains no nuts; it does not establish handling or safety. The source does not name a city. Mexican cacahuates and gendered mesero notes are source provenance, not a Japanese locale claim. Source Core 6 says nueces means specifically walnuts, while Core 18, Core 27 and Core 30 use it for nuts generally; resolve this source terminology before learner release.",
        "oldCardPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["cards"], 1)],
        "oldReaderPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["reader"], 1)],
        "archivedExactCardOverlapInternal": overlaps,
        "audioScopeReadOnly": {
            "draftFacePlacements": len(draft_faces),
            "twoVoiceClipDecisionsIfTextApproved": 2 * len(draft_faces),
            "twoVoiceSubmittedCharactersIfTextApproved": 2 * sum(len(r["targetJapaneseDraft"]) for r in draft_faces),
            "grossEstimateUSDAt30PerMillionCharacters": round(
                30 * 2 * sum(len(r["targetJapaneseDraft"]) for r in draft_faces) / 1_000_000, 5),
            "archivedExactJapaneseCardTextOverlapsOnly": len(overlaps),
            "candidateIDsMatchingArchive": len(new_ids & old_ids),
            "synthesized": False, "listeningApproved": False, "registered": False,
        },
        "savedPositionPolicy": "Archived draft rows were not registered and have no explicit stable row IDs. New revision-scoped IDs do not authorize saved-item or audio placement migration. This revision's order is frozen; any insertion or reordering requires a new revision.",
        "reviewQuestionsInternal": [
            "Resolve source objective/Reader 8 generic medical-advice text before selecting a Japanese face; keep clinical vocabulary direct in teaching text.",
            "Confirm whether ナッツ and ピーナッツ adequately distinguish source frutos secos and cacahuates in the intended locale.",
            "Confirm 材料 versus 原材料 for spoken ingredient questions; the source gives no explicit referent until a later bread line.",
            "Confirm that the kitchen-reported no-nuts statement in Reader 5 is clearly attributed and does not imply handling verification.",
            "Keep Core 18 cross-contact and shared-utensil content out of Core 6 unless the source lesson is deliberately changed.",
            "Review first-person narrator and neutral 店員 versus source mesero male server before audio casting.",
        ],
        "missing": ["one withheld Reader Japanese face", "six authored mode prompt/target pairs",
                    "source-aligned Japanese grammar/form examples", "contextual dictionary senses",
                    "speaking setup and word bank", "authorized saved-item policy",
                    "exact-text audio and per-clip listening", "learner/offline/native acceptance"],
        "gates": GATES,
    }


if __name__ == "__main__":
    rendered = json.dumps(render(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        if OUT.read_text(encoding="utf-8") != rendered:
            raise ValueError("stale generated packet")
    else:
        OUT.write_text(rendered, encoding="utf-8")
