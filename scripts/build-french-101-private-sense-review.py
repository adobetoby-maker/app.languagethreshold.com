#!/usr/bin/env python3
"""Pin a bounded, source-backed review of French 101 gloss variants; never merge senses."""

import argparse
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "content/french-basics/private-dictionary-sense-review.json"
BUILDER = Path(__file__).with_name("build-french-101-private-dictionary.py")
spec = importlib.util.spec_from_file_location("french_inventory", BUILDER)
inventory_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inventory_module)

# These are source-level annotation overlaps, not assertions of reviewed French dictionary senses.
SOURCE_ALIGNED = {
    "gentil": "The two authored English rows say kind and vary only the masculine/man annotation.",
    "gentille": "The two authored English rows say kind and vary only the feminine/woman annotation.",
    "la porte": "Both authored rows identify a door; one includes the article and the other annotates feminine singular.",
    "la professeure": "Both authored rows identify a female teacher with different grammatical annotations.",
    "la table": "Both authored rows identify a table; one includes the article and the other annotates feminine singular.",
    "s’il vous plaît": "Both authored rows say please; one adds the politeness annotation.",
    "sur": "Both authored rows say on; one adds a location annotation.",
    "trois": "The authored rows use the English numeral 3 and its written form three.",
    "le": "All three authored rows say the and identify the masculine article; two explicitly add singular.",
    "un cahier": "Both authored rows identify a notebook; the later row annotates masculine singular while the earlier gloss includes a.",
    "un livre": "All three authored rows identify a book; two annotate masculine singular and one includes a.",
    "un étudiant": "Both authored rows identify a student in the masculine form; one says man and the other annotates masculine singular.",
    "une étudiante": "Both authored rows identify a student in the feminine form; one says woman and the other annotates feminine singular.",
}


def build(inventory=None):
    inventory = inventory or inventory_module.build()
    assert (inventory["target"], inventory["native"], inventory["reviewed"],
            inventory["registered"], inventory["audio"]) == ("French", "English", False, False, False)
    senses = {sense["senseId"]: sense for sense in inventory["senses"]}
    assert len(inventory["ambiguousHeadwords"]) == 25
    assert set(SOURCE_ALIGNED) <= {row["target"] for row in inventory["ambiguousHeadwords"]}
    cases = []
    for row in inventory["ambiguousHeadwords"]:
        evidence = []
        for sense_id in row["senseIds"]:
            sense = senses[sense_id]
            assert sense["headwordId"] == row["headwordId"]
            assert "multiple-English-glosses-needs-sense-review" in sense["reviewFlags"]
            occurrence = sense["occurrences"][0]
            path = ROOT / occurrence["draftPath"]
            assert inventory["sourceSha256"][occurrence["draftPath"]] == inventory_module.sha(path.read_bytes())
            draft = json.loads(path.read_bytes())
            lesson = next(item for item in draft["lessons"] if item["n"] == occurrence["lesson"])
            word = lesson["words"][occurrence["wordIndex"]]
            source_target, source_gloss = word["fr"], word["en"]
            overlay_evidence = {}
            if "overlayPath" in occurrence:
                overlay_path = ROOT / occurrence["overlayPath"]
                overlay_hash = inventory["sourceSha256"][occurrence["overlayPath"]]
                assert overlay_hash == inventory_module.sha(overlay_path.read_bytes())
                overlays = json.loads(overlay_path.read_bytes())["cardOverrides"]
                corrections = [row for row in overlays if row["lesson"] == occurrence["lesson"]
                               and inventory_module.key(row["from"]["target"]) == inventory_module.key(source_target)
                               and inventory_module.key(row["from"]["native"]) == inventory_module.key(source_gloss)
                               and inventory_module.key(row["to"]["target"]) == inventory_module.key(sense["target"])
                               and inventory_module.key(row["to"]["native"]) == inventory_module.key(sense["native"])]
                assert len(corrections) == 1
                overlay_evidence = {"overlayPath": occurrence["overlayPath"], "overlaySha256": overlay_hash,
                                    "sourceTarget": source_target, "sourceEnglishGloss": source_gloss}
            else:
                assert inventory_module.key(source_target) == inventory_module.key(sense["target"])
                assert inventory_module.key(source_gloss) == inventory_module.key(sense["native"])
            evidence.append({
                "senseId": sense_id,
                "target": sense["target"],
                "englishGloss": sense["native"],
                "stage": occurrence["stage"],
                "lesson": occurrence["lesson"],
                "wordIndex": occurrence["wordIndex"],
                "sourcePath": occurrence["draftPath"],
                "sourceSha256": inventory["sourceSha256"][occurrence["draftPath"]],
                **overlay_evidence,
            })
        aligned = row["target"] in SOURCE_ALIGNED
        cases.append({
            "headwordId": row["headwordId"],
            "target": row["target"],
            "sourceLevelStatus": "annotation-overlap-provisional" if aligned else "unresolved",
            "sourceLevelReason": SOURCE_ALIGNED.get(row["target"]),
            "senseIds": row["senseIds"],
            "evidence": evidence,
            "qualifiedFrenchReviewRequired": True,
            "reviewed": False,
            "registered": False,
        })
    return {
        "schema": 1,
        "target": "French",
        "native": "English",
        "registered": False,
        "reviewed": False,
        "senseIdsMerged": False,
        "sourceInventorySha256": inventory_module.sha(
            (json.dumps(inventory, ensure_ascii=False, indent=2) + "\n").encode("utf-8")),
        "counts": {"ambiguousHeadwords": 25, "sourceAlignedAnnotations": 13, "unresolved": 12},
        "cases": cases,
    }


def validate(review):
    if review != build():
        raise ValueError("French 101 sense-review evidence, flags or source content changed")
    assert all(not row["reviewed"] and not row["registered"] and
               row["qualifiedFrenchReviewRequired"] for row in review["cases"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = (json.dumps(build(), ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if args.check:
        assert OUTPUT.read_bytes() == encoded, "French 101 private sense-review file is stale"
        validate(json.loads(OUTPUT.read_bytes()))
    else:
        OUTPUT.write_bytes(encoded)
    print("French 101: 13 source-aligned annotation overlaps, 12 unresolved; all 25 require qualified review")


if __name__ == "__main__":
    main()
