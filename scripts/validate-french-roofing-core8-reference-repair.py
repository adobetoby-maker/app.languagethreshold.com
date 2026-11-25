#!/usr/bin/env python3
"""Read-only owning-row, preservation and downstream-pin checks for Core8 refs."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASELINE = "a940582fa4eba0f3c14c1251dbcd9a4b705de102"
REVIEW = "content/french-roofing/review/core-8-source-decision-2026-11-18"
CANDIDATE = "content/french-roofing/candidates/core-8-authored-candidate-2026-11-19/candidate.json"


def old_json(path):
    return json.loads(subprocess.check_output(["git", "show", BASELINE + ":" + path], cwd=ROOT))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    packet_bytes = (ROOT / REVIEW / "packet.json").read_bytes()
    packet = json.loads(packet_bytes)
    previous = old_json(REVIEW + "/packet.json")
    previous_bytes = subprocess.check_output(["git", "show", BASELINE + ":" + REVIEW + "/packet.json"], cwd=ROOT)
    crosswalk = json.loads((ROOT / REVIEW / "legacy-reference-crosswalk-2026-11-24.json").read_text())
    core7 = json.loads((ROOT / "content/french-roofing/review/core-7-source-decision-2026-11-18/packet.json").read_text())
    assert core7 == old_json("content/french-roofing/review/core-7-source-decision-2026-11-18/packet.json"), "Core7 changed"
    code = """const n=8;const [c,w,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-words.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS.find(x=>x.n===n),words:w.ROOFING_LESSON_WORDS[n],passage:p.ROOFING_LESSON_PASSAGES[n]}));"""
    owning = json.loads(subprocess.check_output(["node", "--experimental-strip-types", "--input-type=module", "-e", code], cwd=ROOT))
    assert owning["lesson"]["n"] == 8
    assert owning["lesson"]["words"] == owning["words"]
    restored = copy.deepcopy(packet)
    repair = restored.pop("legacySourceReferenceRepair")
    assert repair["previousPacketSha256"] == digest(previous_bytes)
    assert repair["baseline"] == BASELINE and repair["sourceOwnerSection"] == 8
    assert repair["savedItemMappingApproved"] is repair["progressImportApproved"] is repair["runtimeIdentityChanged"] is False
    assert packet["sourceFileSha256"] == previous["sourceFileSha256"]
    for path, value in packet["sourceFileSha256"].items():
        assert digest((ROOT / path).read_bytes()) == value, path
    before_refs, after_refs = [], []
    expected_crosswalk = []
    for group, segment, owner in (("cards", "words", "src/data/roofing-lesson-words.ts"), ("reader", "passage", "src/data/roofing-lesson-passages.ts")):
        assert len(packet[group]) == len(previous[group])
        for position, (row, prior, reset) in enumerate(zip(packet[group], previous[group], restored[group]), 1):
            if group == "cards":
                source = owning["words"][position - 1]
                assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (source["es"], source["en"], source["kind"])
            else:
                assert (row["sourceSpanish"], row["sourceEnglish"]) == (owning["passage"]["es"][position - 1], owning["passage"]["en"][position - 1])
            assert row["legacySourceRef"] == f"roofing:8:{segment}:{position}"
            history = reset.pop("legacySourceRefHistory")
            assert history == [{"reference": prior["legacySourceRef"], "status": "superseded erroneous provenance; no approved progress mapping"}]
            reset["legacySourceRef"] = prior["legacySourceRef"]
            before_refs.append(prior["legacySourceRef"])
            after_refs.append(row["legacySourceRef"])
            expected_crosswalk.append({
                "packetRowId": row["id"], "previousLegacySourceRef": prior["legacySourceRef"],
                "repairedLegacySourceRef": row["legacySourceRef"], "owningSourcePath": owner,
                "owningSection": 8, "sourcePosition": position,
                "sourceSpanish": row["sourceSpanish"], "sourceEnglish": row["sourceEnglish"],
                "sourceContentSha256": digest(json.dumps([row["sourceSpanish"], row["sourceEnglish"]], ensure_ascii=False, separators=(",", ":")).encode()),
            })
    assert restored == previous, "Unexpected authored text, ID, order, hold or gate change"
    core7_refs = {row["legacySourceRef"] for group in ("cards", "reader") for row in core7[group]}
    assert len(set(before_refs) & core7_refs) == 23
    assert len(after_refs) == len(set(after_refs)) == 23
    assert not set(after_refs) & core7_refs
    assert crosswalk["rows"] == expected_crosswalk
    assert crosswalk["previousPacketSha256"] == digest(previous_bytes)
    assert crosswalk["repairedPacketSha256"] == digest(packet_bytes)
    assert crosswalk["sourceFileSha256"] == packet["sourceFileSha256"]
    assert crosswalk["orderedSourceRowsSha256"] == packet["orderedSourceRowsSha256"] == previous["orderedSourceRowsSha256"]
    assert crosswalk["savedItemMappingApproved"] is crosswalk["progressImportApproved"] is crosswalk["registered"] is crosswalk["reviewed"] is False
    candidate = json.loads((ROOT / CANDIDATE).read_text())
    restored_candidate = copy.deepcopy(candidate)
    candidate_repair = restored_candidate.pop("sourceReferenceRepair20261124")
    assert candidate_repair["previousPacketSha256"] == digest(previous_bytes)
    assert candidate_repair["repairedPacketSha256"] == digest(packet_bytes)
    assert candidate_repair["savedItemMappingApproved"] is candidate_repair["progressImportApproved"] is False
    assert candidate["sourcePacket"]["sha256"] == digest(packet_bytes)
    restored_candidate["sourcePacket"]["sha256"] = digest(previous_bytes)
    assert restored_candidate == old_json(CANDIDATE), "Unexpected dependent teaching change"
    assert all(value is False for value in packet["gates"].values())
    assert all(value is False for value in candidate["gates"].values())
    paths = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", BASELINE, "content/french-roofing/candidates"], cwd=ROOT, text=True).splitlines()
    checked = 0
    for path in paths:
        if path.endswith("/candidate.json"):
            item = json.loads((ROOT / path).read_text())
            assert digest((ROOT / item["sourcePacket"]["path"]).read_bytes()) == item["sourcePacket"]["sha256"], path
            checked += 1
    assert checked == 60
    print(json.dumps({"status": "PASS", "baseline": BASELINE, "matchedOwningCards": 15, "matchedOwningReaderTurns": 8, "referencesRepaired": 23, "core7CollisionsBefore": 23, "core7CollisionsAfter": 0, "downstreamCandidateHashesChecked": checked, "previousPacketSha256": digest(previous_bytes), "repairedPacketSha256": digest(packet_bytes), "authoredTextIDsOrderHoldsAndSourcePinsPreserved": True, "savedItemMappingApproved": False, "progressImportApproved": False}, indent=2))


if __name__ == "__main__":
    main()
