#!/usr/bin/env python3
"""Build an inert, current-source French Breakfast Master 3 review packet."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
COURSE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/master-1-3-draft.json"
PRIOR = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"
FABLE = HERE / "fable-output.json"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "learnerRegistered",
    "audioRegistered", "audioApproved", "listeningReviewed", "playbackEnabled",
    "scoringEnabled", "progressTracking", "progressWritesEnabled",
    "offlineRegistered", "v4Registered", "released",
)}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lesson_sha(course_row, passage_row):
    data = json.dumps({"course": course_row, "passage": passage_row}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(data.encode()).hexdigest()


def get_fable():
    outer = json.loads(FABLE.read_text())
    assert not outer["is_error"]
    assert "claude-fable-5-2" in outer["modelUsage"]
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", outer["result"], re.S)
    assert match, "Fable correction must contain a JSON object"
    return json.loads(match.group(1))


course = json.loads(COURSE.read_text())["lessons"][2]
passage = json.loads(READER.read_text())["lessons"]["3"]["passage"]
archive = next(x for x in json.loads(ARCHIVE.read_text())["lessons"] if x["n"] == 3)
prior = next(x for x in json.loads(PRIOR.read_text())["lessons"] if x["stage"] == "master" and x["n"] == 3)
candidate = get_fable()
candidate["readerFrench"][4] = "Carmen : Dis-lui comme ça : « Bonjour, doña Eustolia, pourrais-je avoir un café de olla ? »"
candidate["readerFrench"][7] = "Carmen : Si tu préfères autre chose, commande un chocolate de agua, un chocolat chaud préparé à l’eau, qui est aussi très bon."
candidate["readerFrench"][17] = "Quelques minutes plus tard, Sofi revient au banc, tenant fermement la tasse par l’anse, son pan de yema dans l’autre main."
assert course["n"] == 3
assert len(course["words"]) == len(candidate["cardsFrench"]) == len(prior["words"]) == 23
assert len(passage["native"]) == len(passage["target"]) == len(candidate["readerFrench"]) == len(prior["reader"]) == 18
assert [w["en"] for w in course["words"]] == [w["en"] for w in archive["sourceWordsEnglish"]]
assert passage["native"] == archive["sourcePassageEnglish"]
revision = lesson_sha(course, passage)[:12]
cards = []
for n, (source, french, old) in enumerate(zip(course["words"], candidate["cardsFrench"], prior["words"]), 1):
    assert old["id"] == f"master:3:word:{n}"
    cards.append({
        "id": f"master:3:source-{revision}:word:{n}",
        "legacyDraftId": old["id"],
        "sourceSpanish": source["es"],
        "supportEnglish": source["en"],
        "targetFrenchDraft": french,
        "kind": source["kind"],
        **({"sourceNoteEnglish": source["note"]} if "note" in source else {}),
    })
reader = []
for n, (es, en, french, old) in enumerate(zip(passage["target"], passage["native"], candidate["readerFrench"], prior["reader"]), 1):
    assert old["id"] == f"master:3:line:{n}"
    reader.append({
        "id": f"master:3:source-{revision}:line:{n}",
        "legacyDraftId": old["id"],
        "sourceSpanish": es,
        "supportEnglish": en,
        "targetFrenchDraft": french,
    })

packet = {
    "schema": "lt.inert-source-review.v1",
    "lessonKey": "master:3",
    "pair": {"target": "French", "support": "English"},
    "source": {
        "coursePath": str(COURSE.relative_to(ROOT)), "courseSha256": sha(COURSE),
        "readerPath": str(READER.relative_to(ROOT)), "readerSha256": sha(READER),
        "lessonSha256": lesson_sha(course, passage),
        "titleEnglish": course["title"], "objectiveEnglish": course["objective"],
        "speakingEnglish": course["speaking"],
        "sourceGrammar": course["grammar"],
        "passageTitleSpanish": passage["title"],
    },
    "priorDraft": {
        "archivePath": str(ARCHIVE.relative_to(ROOT)), "archiveSha256": sha(ARCHIVE),
        "runtimePath": str(PRIOR.relative_to(ROOT)), "runtimeSha256": sha(PRIOR),
        "oldScene": "Montréal café, hot chocolate, generic pastry, ten-dollar bill",
        "sourceScene": "Oaxaca market fonda, café de olla, pan de yema, 50-peso bill",
        "disposition": "Archived French answers and saved-item positions are superseded in this inert candidate only; no progress migration is authorized.",
    },
    "titleFrenchDraft": candidate["titleFrench"],
    "focusFrenchDraft": candidate["focusFrench"],
    "cards": cards,
    "reader": reader,
    "speakingDraft": None,
    "authoredModeActivities": None,
    "dictionarySensesReviewed": False,
    "reviewNotesEnglish": [
        "French candidate aligns the current Oaxaca source; the archived Montréal lesson is not used as a source.",
        "Named food and place terms remain in the French answer; explanations belong to source notes or a future dictionary sense, not the answer string.",
        "The Spanish lo changes referent between hot clay mug and coffee. French la/le/y choices in cards 17–19 and Reader 12–15 need qualified referent and hot-drink sequence review before learner use.",
        "Cards 21/22 and Reader 10/5 correct the archived payment and formal-request patterns; qualified French and locale review remain open.",
        "Author self-check added quotation marks to Reader 5, the water-made chocolate gloss to Reader 8, and the named bread to Reader 18 after Fable correction.",
    ],
    "unresolvedQuestions": candidate["unresolvedQuestions"],
    "audioScope": {
        "status": "read-only estimate; no synthesis, technical verification, listening decision, reuse or registration",
        "voices": 2,
        "selectedFrenchStrings": len(cards) + len(reader),
        "potentialClipDecisions": 2 * (len(cards) + len(reader)),
        "submittedCharacters": sum(map(len, [c["targetFrenchDraft"] for c in cards] + [r["targetFrenchDraft"] for r in reader])),
        "rateUsdPerMillionCharacters": 30,
    },
    "gates": GATES,
}
packet["audioScope"]["estimatedGrossUsd"] = round(packet["audioScope"]["submittedCharacters"] * 30 / 1_000_000, 6)
out = HERE / "master-3.json"
out.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
manifest = {
    "sourceCourseSha256": sha(COURSE), "sourceReaderSha256": sha(READER),
    "archiveSha256": sha(ARCHIVE), "priorRuntimeSha256": sha(PRIOR),
    "fableOutputSha256": sha(FABLE), "packetSha256": sha(out),
    "reviewed": False, "registered": False, "audioRegistered": False,
}
(HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
