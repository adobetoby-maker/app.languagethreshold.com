#!/usr/bin/env python3
"""Validate Foreman Foundation 10 exact source, stage identity and closed gates."""
import hashlib
import json
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
record = json.loads((HERE / "decision.json").read_text())
assert record["schema"] == 1
assert record["pairKey"] == "Japanese:English"
assert record["stableLessonId"] == "foundation-construction-foreman:10:ja-en"
assert record["lessonKey"] == "foundation:10"
assert record["reviewed"] is False and not any(record["gates"].values())
assert len(record["cards"]) == 16 and len(record["reader"]) == 9

raw = {}
for path_key, hash_key in (("curriculumPath", "curriculumSha256"),
                           ("readerPath", "readerSha256"),
                           ("japaneseDraftPath", "japaneseDraftSha256")):
    path = record["source"][path_key]
    pinned = subprocess.check_output(["git", "show", f"{record['sourceCommit']}:{path}"], cwd=ROOT)
    assert (ROOT / path).read_bytes() == pinned, f"current source drift: {path}"
    assert hashlib.sha256(pinned).hexdigest() == record["source"][hash_key]
    raw[path] = json.loads(pinned)

lesson = raw[record["source"]["curriculumPath"]]["lessons"][9]
reader = raw[record["source"]["readerPath"]]["lessons"]["10"]["passage"]
old = raw[record["source"]["japaneseDraftPath"]]["lessons"][9]
assert lesson["n"] == old["n"] == 10
assert record["source"]["titleEnglish"] == lesson["title"]
assert record["source"]["objectiveEnglish"] == lesson["objective"]
assert record["source"]["focusSpanish"] == lesson["focus"]
assert record["source"]["speakingEnglish"] == lesson["speaking"]
assert record["source"]["readerTitleSpanish"] == reader["title"]
assert record["archivedDraft"]["title"] == old["title"]
assert record["archivedDraft"]["scene"] == old["scene"]
assert record["archivedDraft"]["readerCount"] == len(old["dialogue"])

ids = set()
for pos, (row, exact) in enumerate(zip(record["cards"], lesson["words"]), 1):
    assert row["position"] == pos
    assert row["id"] == f"{record['candidateRevision']}:card:{pos:02d}"
    assert row["id"] not in ids
    ids.add(row["id"])
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"], row["sourceNoteInternal"]) == (exact["es"], exact["en"], exact["kind"], exact.get("note"))
    assert row["selectedJapanese"] is None
    assert row["decisionOpen"] == (row["japaneseDraft"] is None)
    if row["japaneseDraft"] is not None:
        assert row["japaneseDraft"].strip()
for pos, row in enumerate(record["reader"], 1):
    assert row["position"] == pos
    assert row["id"] == f"{record['candidateRevision']}:reader:{pos:02d}"
    assert row["id"] not in ids
    ids.add(row["id"])
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (reader["target"][pos - 1], reader["native"][pos - 1])
    assert row["selectedJapanese"] is None
    assert row["decisionOpen"] == (row["japaneseDraft"] is None)
    if row["japaneseDraft"] is not None:
        assert row["japaneseDraft"].strip()
assert [x["position"] for x in record["cards"] if x["decisionOpen"]] == [1, 9, 10, 13, 14, 15, 16]
assert [x["position"] for x in record["reader"] if x["decisionOpen"]] == [2, 3, 5, 6, 7, 8]
assert "Houston" in reader["native"][0]
assert "911" in lesson["words"][14]["en"] and "911" in reader["native"][8]
assert "electricity" in reader["native"][7]
assert "Spanish" in lesson["words"][12]["en"]
assert "Morning check-in" in old["title"]

metadata = json.loads((HERE / "ai-assistance-metadata.json").read_text())
assert metadata["cliAuthStatus"]["loggedIn"] is False
assert metadata["actualModelCalls"] == [] and metadata["actualTokenUse"] == 0
assert metadata["qualifiedReview"] is False
print("PASS Japanese Foreman Foundation 10 exact source, stable IDs, 13 null faces and closed gates")
