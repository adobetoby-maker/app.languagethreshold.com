#!/usr/bin/env python3
"""Build source-pinned private French 101 Master 1–20 form practice."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-basics/private-runtime-master-1-20.json"
OUTPUT = ROOT / "content/french-basics/private-form-practice-master-1-20-fr-en.json"

# Select contextual turns that exercise the named Master lesson objective.
SELECTED = {
    1: [(2, "formal-introduction"), (6, "reason-parce-que"), (9, "informal-tu"), (10, "formal-vous")],
    2: [(2, "inside-dans"), (3, "on-top-sur"), (4, "missing-il-manque"), (7, "substitute-a-la-place")],
    3: [(1, "total-il-y-a"), (2, "need-il-nous-faut"), (4, "recipient-lui"), (6, "each-chacun"), (10, "two-pronouns-me-le")],
    4: [(1, "role-question"), (2, "ongoing-role"), (4, "temporary-condition"), (11, "role-versus-availability")],
    5: [(1, "past-il-y-avait"), (2, "now-se-trouvent"), (3, "completed-deplace"), (8, "verified-location"), (9, "past-etre-location")],
    6: [(1, "polite-conditional"), (5, "repair-je-voulais-dire"), (6, "request-pourriez-vous"), (9, "check-si-je-comprends"), (11, "written-confirmation")],
    7: [(1, "habit-imparfait"), (4, "instead-au-lieu-de"), (6, "proposal-conditional"), (8, "could-conditional"), (12, "confirmed-time")],
    8: [(1, "deadline-request"), (4, "conflict-description"), (9, "conditional-alternative"), (11, "written-confirmation")],
    9: [(2, "comparison-plus"), (4, "comparison-moins"), (9, "comparison-aussi"), (10, "better-meilleure")],
    10: [(3, "demonstrative-celle-ci"), (4, "two-pronouns-la-lui"), (7, "ownership-appartenir"), (8, "possessive-la-mienne"), (11, "feminine-la-mienne")],
    11: [(2, "without-sans"), (4, "preference-or-restriction"), (7, "alternative-au-lieu-de"), (9, "confirm-without-sugar"), (12, "recipient-lui-moi")],
    12: [(1, "obligation-devons"), (3, "ability-negation"), (7, "permission-droit-de"), (9, "condition-si"), (11, "sequence-d-abord-ensuite")],
    13: [(1, "deadline"), (2, "required-il-faut"), (5, "dependency-avant-de"), (8, "after-validation"), (12, "optional-si")],
    14: [(1, "habit-imparfait"), (3, "completed-passe-compose"), (5, "sudden-event"), (7, "interruption"), (10, "revised-future")],
    15: [(2, "alternate-imperative"), (4, "route-imperative"), (5, "turn-after-not-before"), (10, "incorrect-route"), (11, "route-repair")],
    16: [(1, "now-en-train-de"), (2, "progressive-answer"), (6, "dependency-avant-de"), (10, "near-future-aller"), (11, "revised-plan")],
    17: [(4, "demonstrative-celui-ci"), (5, "ambiguous-lui"), (6, "referent-check"), (7, "named-repair"), (10, "plural-recipient-leur")],
    18: [(1, "departure-past"), (2, "arrival-past"), (4, "interruption-past"), (7, "entry-past"), (11, "return-past")],
    19: [(1, "habit-imparfait"), (3, "repeated-background"), (5, "single-event-passe-compose"), (7, "completed-response"), (9, "current-routine")],
    20: [(1, "purpose-opening"), (4, "criteria-comparison"), (6, "changed-plan"), (8, "relevant-past"), (10, "task-owners"), (12, "closing-confirmation")],
}


def stable_id(*parts):
    return "form-fr-en-" + hashlib.sha256("\0".join(map(str, parts)).encode()).hexdigest()[:16]


def split_spoken_pair(french_line, english_line):
    french_speaker, colon, french = french_line.partition(" : ")
    english_speaker, english_colon, english = english_line.partition(": ")
    assert colon and english_colon and french_speaker.strip() and english_speaker.strip()
    assert french.strip() and english.strip()
    return french_speaker, french, english_speaker, english


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert (source["privatePilot"], source["registered"], source["reviewed"]) == (True, False, False)
    assert (source["target"], source["native"]) == ("French", "English")
    stage, support = source["masterStageFragment"]["lessons"], source["support"]
    assert len(stage) == len(support) == len(SELECTED) == 20
    lessons, ids = [], set()
    for n, selected in SELECTED.items():
        lesson, overlay = stage[n - 1], support[n - 1]
        stable_key = f"master-french-basics:{n}"
        assert lesson["n"] == overlay["n"] == n
        assert overlay["stableLessonKey"] == stable_key
        reader = overlay["reader"]
        assert len(reader["target"]) == len(reader["native"]) == 12
        assert len({turn for turn, _ in selected}) == len(selected)
        notes = overlay["grammarNotes"]
        assert notes["explanation"] and notes["model"]
        prompts = []
        for turn, focus in selected:
            french_line, english_line = reader["target"][turn - 1], reader["native"][turn - 1]
            fr_speaker, fr, en_speaker, en = split_spoken_pair(french_line, english_line)
            prompt_id = stable_id(stable_key, "reader", turn, french_line, english_line)
            assert prompt_id not in ids
            ids.add(prompt_id)
            prompts.append({
                "id": prompt_id, "source": "aligned-reader", "sourceReaderTurn": turn,
                "sourceFrenchLine": french_line, "sourceEnglishLine": english_line,
                "sourceFrenchSpeaker": fr_speaker, "sourceEnglishSpeaker": en_speaker,
                "audioDisplayText": french_line,
                "focus": focus, "frenchAnswer": fr, "englishPrompt": en,
                "knownFrenchVariants": [fr],
                "practice": ["recognize-meaning", "produce-target"], "reviewed": False,
            })
        lessons.append({
            "lesson": n, "stableLessonKey": stable_key, "grammarModel": notes["model"],
            "prompts": prompts, "reviewed": False,
        })
    assert len(ids) == 96
    return {
        "schema": 1, "state": "private-form-practice-draft", "pairKey": "French:English",
        "courseId": "french-basics:fr-en", "registered": False, "reviewed": False,
        "sourceFile": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "counts": {"lessons": len(lessons), "alignedReaderPrompts": len(ids),
                   "newAuthoredContrasts": 0, "totalPrompts": len(ids), "grammarModels": len(lessons)},
        "lessons": lessons,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "French 101 Master form practice is stale"
        print("French 101 Master 1–20 contextual form practice and closed gates pass")
    else:
        OUTPUT.write_text(rendered)
        print(OUTPUT)
