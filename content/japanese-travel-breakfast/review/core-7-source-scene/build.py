"""Render an inert, source-pinned Japanese Breakfast Core 7 review packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PLAN = ROOT / "src/data/travel-zone.ts"
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/core-1-30-draft.json"
TEXT = HERE / "candidate-text.json"
OUT = HERE / "source-setting-candidate.json"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled", "v4Imported",
)}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha_text(value):
    return hashlib.sha256(value.encode()).hexdigest()


def build():
    plan = PLAN.read_text()
    title = "Ask what locals eat"
    objective = "ask for a typical regional breakfast and understand a cultural explanation"
    roleplay = "Tell the server you want the breakfast locals actually choose, not a tourist substitute."
    assert all(value in plan for value in (title, objective, roleplay))
    source_file = json.loads(SOURCE.read_text())
    source = source_file["lessons"]["7"]
    old = json.loads(ARCHIVE.read_text())["lessons"][6]
    text = json.loads(TEXT.read_text())
    stable = "travel-breakfast:7:ja-en"
    revision = stable + ":source-scene-v1"
    assert old["n"] == 7 and old["stableId"] == stable
    assert old["sourceEnglish"]["objective"] == objective
    assert old["sourceEnglish"]["roleplay"] == roleplay
    assert source_file["reviewed"] is False
    assert len(source["words"]) == len(text["cardsJa"]) == 16
    passage = source["passage"]
    assert len(passage["target"]) == len(passage["native"]) == len(text["readerJa"]) == 9
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast", "stage": "core",
        "lessonKey": "core:7", "stageId": "travel-breakfast", "lessonNumber": 7,
        "stableLessonId": stable, "candidateRevision": revision,
        "reviewed": False,
        "status": "source-only Japanese-language candidate; unapproved",
        "source": {
            "planPath": str(PLAN.relative_to(ROOT)), "planSha256": sha(PLAN),
            "readerPath": str(SOURCE.relative_to(ROOT)), "readerSha256": sha(SOURCE),
            "planTitleEnglish": title, "objectiveEnglish": objective, "roleplayEnglish": roleplay,
            "readerTitleSpanish": passage["title"], "sourceVerbs": source["verbs"],
        },
        "archivedDraft": {
            "path": str(ARCHIVE.relative_to(ROOT)), "sha256": sha(ARCHIVE),
            "scene": old["scene"], "cardCount": len(old["cards"]), "readerCount": len(old["reader"]),
        },
        "sourceCards": [
            {"id": f"{revision}:card:{i:02d}", "candidatePosition": i,
             "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
             "sourceNoteInternal": word.get("note"), "targetJapaneseDraft": ja,
             "sourceEnglishIsJapaneseGloss": False, "candidateTextSha256": sha_text(ja)}
            for i, (word, ja) in enumerate(zip(source["words"], text["cardsJa"]), 1)
        ],
        "sourceSettingReader": [
            {"id": f"{revision}:reader:{i:02d}", "candidatePosition": i,
             "sourceSpanish": es, "sourceEnglish": en, "targetJapaneseDraft": ja,
             "sourceEnglishIsJapaneseGloss": False, "candidateTextSha256": sha_text(ja)}
            for i, (es, en, ja) in enumerate(zip(passage["target"], passage["native"], text["readerJa"]), 1)
        ],
        "speakingGoalCandidate": "Ask what people in Puebla eat for breakfast; request the dish locals order; ask what is in it and ask the server to repeat slowly.",
        "japaneseSpecificFocusCandidate": "Use polite server requests with ～ていただけますか and distinguish ここの人たち from 地元の人. Preserve Mexican food names and the source Reader scene.",
        "oldCardPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["cards"], 1)
        ],
        "oldReaderPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["reader"], 1)
        ],
        "savedPositionPolicy": "The archived rows have no explicit row IDs and describe a different Sam breakfast-set scene. Revision-scoped candidate IDs do not authorize saved-item migration or progress changes.",
        "unresolvedInternal": [
            "The archived Sam rice-ball/miso/pickles scene contradicts the current Puebla source; retain it as archive only.",
            "The roleplay mentions a tourist substitute and card 13 teaches its refusal; the Reader never says it. Do not insert it into Reader text.",
            "The source card café de olla says spiced clay-pot coffee; only Reader 7 says cinnamon. Do not add cinnamon to card 7.",
            "The source Reader asks what is in chilaquiles but the following answer explains café de olla and pan dulce; preserve this source sequence pending source review.",
            "Japanese food transliterations, clay-pot vessel, typical-dish register and card 12 ordering phrasing require qualified Japanese/Mexican-food review.",
            "The source marks the server male; Japanese narration may omit the gender where English Reader does. Check gender language and house style.",
            "The Spanish source is itself reviewed:false; it is a structural parity anchor, not qualified approval.",
        ] + text["unresolvedReviewQuestions"],
        "missing": ["six authored prompt-answer mode pairs", "kana readings for learner display", "literal English glosses of Japanese faces", "Japanese Reader title", "contextual forms", "full speaking setup", "dictionary senses", "saved-item reconciliation decision", "exact-text audio and individual listening decisions", "qualified Japanese and Mexican food/domain review"],
        "gates": GATES,
    }


if __name__ == "__main__":
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text() != rendered:
            raise SystemExit("Core 7 review packet is stale")
        print("Core 7 source packet current")
    else:
        OUT.write_text(rendered)
        print(OUT)
