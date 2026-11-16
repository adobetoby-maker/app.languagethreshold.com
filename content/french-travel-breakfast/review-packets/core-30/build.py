#!/usr/bin/env python3
"""Build inert Core 30 source-review evidence; never import this into runtime."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
PRIOR = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"
TRIAGE = ROOT / "docs/french-program/breakfast-roofing-private-source-triage-2026-11-14.md"
GATES = {key: False for key in ("reviewed", "registered", "learnerVisible", "learnerRegistered", "audioRegistered", "audioApproved", "listeningReviewed", "playbackEnabled", "scoringEnabled", "progressTracking", "progressWritesEnabled", "offlineRegistered", "released")}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


source = json.loads(SOURCE.read_text())["lessons"]["30"]
prior = next(x for x in json.loads(PRIOR.read_text())["lessons"] if x["stage"] == "core" and x["n"] == 30)
assert len(source["words"]) == len(prior["words"]) == 17
assert len(source["passage"]["native"]) == len(source["passage"]["target"]) == len(prior["reader"]) == 9
cards = []
for n, (row, old) in enumerate(zip(source["words"], prior["words"]), 1):
    assert row["en"] == old["supportEnglish"] == old["sourceEnglish"]
    fr = "le pan dulce" if n == 6 else "un montant facturé" if n == 10 else old["targetFrench"]
    card = {"id": old["id"], "sourceSpanish": row["es"], "supportEnglish": row["en"], "targetFrenchDraft": fr, "kind": row["kind"]}
    if n == 6:
        card["reviewNoteEnglish"] = "Mexican pan dulce covers a range of sweet breakfast pastries; confirm French explanation and pronunciation separately from the answer."
    cards.append(card)
reader = []
for n, (es, en, old) in enumerate(zip(source["passage"]["target"], source["passage"]["native"], prior["reader"]), 1):
    assert old["id"] == f"core:30:line:{n}"
    fr = old["targetFrench"]
    if n == 3:
        fr = "Avant de commander, je dis au serveur : « Ma fille est allergique aux fruits à coque ; le pan dulce en contient-il ? »"
    elif n == 4:
        fr = None
    elif n == 5:
        fr = "Pendant que nous mangeons, je bavarde avec une dame à la table voisine : elle me demande d’où nous venons, me recommande le marché du centre-ville et me dit qu’ici les gens prennent leur petit-déjeuner tranquillement et bavardent longtemps."
    elif n == 6:
        fr = "Au moment de payer au comptoir, je vois que trois cafés nous sont facturés, alors que nous n’en avons commandé que deux."
    elif n == 9:
        fr = "En sortant, je dis à la dame : « Merci beaucoup pour tout, à bientôt. »"
    reader.append({"id": old["id"], "sourceSpanish": es, "supportEnglish": en, "targetFrenchDraft": fr})

packet = {
    "schema": "lt.inert-source-conflict-review.v1",
    "lessonKey": "core:30",
    "pair": {"target": "French", "support": "English"},
    "source": {"path": str(SOURCE.relative_to(ROOT)), "sha256": sha(SOURCE), "passageTitleSpanish": source["passage"]["title"]},
    "priorDraft": {"path": str(PRIOR.relative_to(ROOT)), "sha256": sha(PRIOR)},
    "cards": cards,
    "reader": reader,
    "unresolvedConflict": {
        "id": "core:30:line:4",
        "currentSourceSpanish": reader[3]["sourceSpanish"],
        "currentSupportEnglish": reader[3]["supportEnglish"],
        "archivedSupportEnglish": prior["reader"][3]["supportEnglish"],
        "archivedTargetFrench": prior["reader"][3]["targetFrench"],
        "unmergedAlternativeSource": {"commit": "919ee4af0e79cc4bf44f61f880e4a5eb6916c9c1", "path": "public/lesson-content/es/travel-breakfast.json", "sha256": "0be32206a43cf8ec4f2a7e1768477bc220016c2394d4bffd7b1495b313f9096a", "sourceSpanish": "El mesero pregunta por los ingredientes y la preparación. La cocina no puede descartar el contacto cruzado, así que no pedimos comida para mi hija y usamos el desayuno que trajimos para ella.", "supportEnglish": "The waiter checks ingredients and preparation with the kitchen. They cannot rule out cross-contact, so we do not order café food for my daughter and use the breakfast we brought for her."},
        "selectedFrenchAnswer": None,
        "selectedWritePrompt": None,
        "selectedWriteTarget": None,
        "writeAudit": "The 2026-11-14 triage says the former Write mode targeted this superseded Reader line. No authored Write prompt/target was found in the archived private-runtime candidate, which holds card-ID lists only. Its former target must not be reused or scored.",
        "qualifiedDecisionNeeded": "First decide which Spanish/English source revision is intended. Then obtain qualified allergy and French review of the meal outcome, and author Reader turn 4, dependent card/Write prompt and target, speaking activity and exact-text audio as one reviewed revision.",
        "progressIdentity": {"priorId": "core:30:line:4", "dependentCardIds": ["core:30:word:4", "core:30:word:5"], "reuseDecision": "blocked", "revisionScopedIdDecision": "pending qualified source and ID-grammar review", "migration": "No runtime or progress migration in this source-only packet; reconcile saved Reader/Write references and dependent cards before activation."},
    },
    "speakingDraft": None,
    "authoredModeActivities": None,
    "modeInputIdsDraft": prior["candidateModeInputs"],
    "reviewNotes": ["The current source reports a waiter recommendation based on the cook's no-nuts statement; this packet does not assert the meal is safe for a person with a nut allergy.", "Card 6 and Reader 3 restore Mexican pan dulce rather than substituting a brioche.", "Reader 5 restores the source's long conversation; all French faces remain unreviewed candidates."],
    "gates": GATES,
}

out = HERE / "core-30.json"
out.write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
manifest = {"sourceSha256": sha(SOURCE), "priorDraftSha256": sha(PRIOR), "triageSha256": sha(TRIAGE), "packetSha256": sha(out), "state": "annotated unresolved source conflict for repository review", "gates": GATES}
(HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
