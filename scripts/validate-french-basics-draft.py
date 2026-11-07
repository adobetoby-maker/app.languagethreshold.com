#!/usr/bin/env python3
"""Validate the bounded French 101 draft without claiming runtime coverage."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/data/core60/es/foundation-spanish-basics.json"
source = json.loads(SOURCE.read_text())
for first, last in ((1, 3), (4, 6), (7, 8), (9, 10)):
    draft_path = ROOT / f"content/french-basics/foundation-{first}-{last}-draft.json"
    draft = json.loads(draft_path.read_text())
    assert draft["target"] == "French" and draft["native"] == "English"
    assert draft["moduleId"] == "french-basics" and draft["stage"] == "foundation"
    assert draft["reviewed"] is False and draft["state"] == "authored-draft"
    assert draft["source"]["sourceSha256"] == hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    subset = [
        {key: value for key, value in lesson.items() if key in ("n", "title", "objective", "focus", "words", "speaking")}
        for lesson in source["lessons"][first - 1:last]
    ]
    subset_text = json.dumps(subset, ensure_ascii=False, indent=2) + "\n"
    assert draft["source"]["sourceSubsetSha256"] == hashlib.sha256(subset_text.encode()).hexdigest()
    assert len(draft["lessons"]) == last - first + 1
    for number, lesson in enumerate(draft["lessons"], first):
        assert lesson["n"] == number
        assert lesson["sourceObjectiveEnglish"] == source["lessons"][number - 1]["objective"]
        for key in ("title", "focus", "scene", "speaking"):
            assert lesson[key].strip(), (number, key)
        assert lesson["objective"].strip() and lesson["locale"] == "fr-FR"
        assert len(lesson["words"]) >= 10 and len(lesson["dialogue"]) >= 6
        fronts = [word["fr"] for word in lesson["words"]]
        assert len(fronts) == len(set(fronts)), (number, "duplicate French card")
        assert "des ans" not in fronts, (number, "invalid age card")
        for word in lesson["words"]:
            assert word["fr"].strip() and word["en"].strip()
            assert word["kind"] in {"term", "phrase"}
            if word["fr"] == "est":
                assert "identity" not in word["en"] and "condition" not in word["en"], (number, word)
            if word.get("gender"):
                assert word["gender"] in {"m", "f"}
            if word.get("number"):
                assert word["number"] in {"sg", "pl"}
            if paired := word.get("pairedForm"):
                if word.get("pairType") == "gender":
                    assert word.get("gender") in {"m", "f"} and paired != word["fr"]
                else:
                    current_article = word["fr"].split()[0]
                    paired_article = paired.split()[0]
                    assert (current_article, paired_article) in {
                        ("le", "les"), ("la", "les"), ("les", "le"), ("les", "la"),
                        ("un", "des"), ("une", "des"), ("des", "un"), ("des", "une"),
                    }, (number, word["fr"], paired)
        for entry in lesson["dialogue"]:
            assert entry.count("|") == 1, (number, entry)
            assert all(side.strip() for side in entry.split("|")), (number, entry)
        types = {check["type"] for check in lesson["checks"]}
        assert {"recall", "write", "listening"} <= types
        assert all(check["prompt"].strip() and check["answer"].strip() for check in lesson["checks"])
        assert all(check.get("audioText") and check.get("locale") == "fr-FR" for check in lesson["checks"] if check["type"] == "listening")
print("French 101 Foundation 1–10 drafts: structure and source hashes valid; runtime/review not assessed")
