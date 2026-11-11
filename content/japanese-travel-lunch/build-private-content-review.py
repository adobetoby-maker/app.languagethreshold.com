#!/usr/bin/env python3
"""Build a private, source-pinned Japanese Lunch lesson review packet."""

import argparse
import hashlib
import html
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSE = ROOT / "content/japanese-travel-lunch"
RUNTIME = COURSE / "private-runtime-candidate.json"
DICTIONARY = COURSE / "private-dictionary-candidates.json"
OUTPUT = Path("/Users/drive/lt-audio/japanese-travel-lunch/full-course-2026-11-10/content-review.html")
EVIDENCE = COURSE / "private-content-review-evidence.json"
STAGES = (("Foundation", 10), ("Core", 30), ("Master", 20))
MODES = ("see", "recall", "hear", "type", "say", "write")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def esc(value):
    return html.escape(str(value), quote=True)


def source_purpose(lesson):
    batch = json.loads((ROOT / lesson["sourceBatch"]).read_text(encoding="utf-8"))
    original = next(item for item in batch["lessons"] if item["stableId"] == lesson["stableId"])
    return (original.get("sourceEnglishObjective") or
            original.get("sourceEnglishSkills") or ""), original.get("sourceEnglishScenario", "")


def render(runtime, dictionary):
    if (runtime["pairKey"], runtime["registration"], runtime["reviewed"],
        runtime["audioListeningReviewed"], runtime["lessonCount"],
        dictionary["pairKey"], dictionary["reviewed"], dictionary["runtimeRegistered"]) != (
        "Japanese:English", "disabled", False, False, 60,
        "Japanese:English", False, False):
        raise ValueError("Course or dictionary review gate changed")
    lessons = runtime["lessons"]
    if (len(lessons), sum(len(item["cards"]) for item in lessons),
        sum(len(item["reader"]) for item in lessons)) != (60, 1099, 760):
        raise ValueError("Course content counts changed")
    entries = {ref: entry for entry in dictionary["entries"] for ref in entry["cardRefs"]}
    if len(entries) != 1099 or len(dictionary["ambiguousHeadwords"]) != 32 or len(dictionary["classificationConflicts"]) != 1:
        raise ValueError("Dictionary review scope changed")
    ambiguous = {item["word"] for item in dictionary["ambiguousHeadwords"]}
    conflict = {item["word"] for item in dictionary["classificationConflicts"]}
    sections = []
    navigation = []
    offset = 0
    for stage, count in STAGES:
        stage_links = []
        for lesson in lessons[offset:offset + count]:
            lid = lesson["stableId"]
            stage_links.append(f"<a href='#{esc(lid)}'>{lesson['lessonNumber']}</a>")
            purpose, scenario = source_purpose(lesson)
            if not purpose or lesson["reviewed"] is not False or set(lesson["modes"]) != set(MODES):
                raise ValueError(f"Missing purpose, modes, or closed review gate: {lid}")
            cards = []
            for card in lesson["cards"]:
                entry = entries[card["id"]]
                if entry["word"] != card["ja"] or entry["english"] != card["en"]:
                    raise ValueError(f"Dictionary pair changed: {card['id']}")
                flags = []
                if card["ja"] in ambiguous:
                    flags.append("multiple English labels")
                if card["ja"] in conflict:
                    flags.append("term/phrase conflict")
                if not entry["readerEvidence"]:
                    flags.append("no literal Reader occurrence")
                cards.append(f"<tr><td lang='ja'>{esc(card['ja'])}</td><td>{esc(card['en'])}</td>"
                             f"<td>{esc(card['kind'])}</td><td>{esc(', '.join(flags))}</td></tr>")
            reader = [f"<tr><td>{esc(turn['speaker'])}</td><td lang='ja'>{esc(turn['ja'])}</td>"
                      f"<td>{esc(turn['en'])}</td></tr>" for turn in lesson["reader"]]
            modes = [f"<tr><th>{esc(mode.title())}</th><td>{esc(lesson['modes'][mode]['cueEnglish'])}</td>"
                     f"<td lang='ja'>{esc(lesson['modes'][mode]['modelJapanese'])}</td>"
                     f"<td>{esc(lesson['modes'][mode]['modelEnglish'])}</td></tr>" for mode in MODES]
            speaking = lesson["speaking"]
            sections.append(f"<section id='{esc(lid)}'><h2>{esc(stage)} {lesson['lessonNumber']}: {esc(lesson['title'])}</h2>"
                            f"<p><b>Spanish-course purpose:</b> {esc(purpose)} {esc(scenario)}</p>"
                            f"<p><b>Japanese objective:</b> {esc(lesson['objective'])}</p>"
                            f"<p><b>Focus:</b> {esc(lesson['focus'])}</p><p><b>Scene:</b> {esc(lesson['scene'])}</p>"
                            f"<h3>Cards</h3><table><thead><tr><th>Japanese</th><th>English</th><th>Kind</th><th>Review lead</th></tr></thead>"
                            f"<tbody>{''.join(cards)}</tbody></table>"
                            f"<h3>Reader</h3><table><thead><tr><th>Speaker</th><th>Japanese</th><th>English</th></tr></thead>"
                            f"<tbody>{''.join(reader)}</tbody></table>"
                            f"<h3>Speaking</h3><p><b>Opening:</b> <span lang='ja'>{esc(speaking['opening'])}</span></p>"
                            f"<p><b>Goal:</b> {esc(speaking['goal'])}</p>"
                            f"<h3>Six activities</h3><table><tbody>{''.join(modes)}</tbody></table>"
                            f"<p class='note'>Review ID: <code>{esc(lid)}</code>. Record corrections in the private ledger; marks on this page do not approve or register a lesson.</p></section>")
        navigation.append(f"<p><b>{esc(stage)}:</b> {' · '.join(stage_links)}</p>")
        offset += count
    if offset != 60:
        raise ValueError("Stage count changed")
    style = "body{font:16px system-ui,sans-serif;line-height:1.5;max-width:1100px;margin:2rem auto;padding:0 1rem;color:#18222e}h1,h2,h3{line-height:1.25}section{border:1px solid #aab5c2;border-radius:12px;padding:1.3rem;margin:1.5rem 0}table{border-collapse:collapse;width:100%;margin:.6rem 0 1.4rem}th,td{border:1px solid #bcc6d1;padding:.42rem;text-align:left;vertical-align:top}tr:nth-child(even){background:#f1f5f8}[lang=ja]{font-family:system-ui,sans-serif;font-size:1.07em}.note{color:#445}@media(max-width:650px){table{display:block;overflow:auto}section{padding:.8rem}}"
    intro = ("<h1>Japanese Lunch — private lesson review</h1>"
             "<p>All 60 lessons are unreviewed and unregistered. Compare each Spanish-course purpose with the Japanese teaching, aligned Reader, speaking scene, and six activities. Dictionary flags are review leads, not automatic corrections. This packet does not change review status, audio approval, playback, or learner progress.</p>"
             f"<p>Scope: 60 lessons, 1,099 card placements, 760 Reader turns, 360 activities; {len(ambiguous)} multi-label headwords, one classification conflict, {dictionary['candidatesWithoutReaderEvidence']} dictionary candidates without a literal Reader occurrence. The <a href='listening-review.html'>separate private listening sheet</a> covers newly synthesized audio.</p>")
    return ("<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
            f"<title>Japanese Lunch private lesson review</title><style>{style}</style>{intro}"
            f"<nav aria-label='Lesson index'>{''.join(navigation)}</nav>{''.join(sections)}</html>\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--evidence", type=Path, default=EVIDENCE)
    args = parser.parse_args()
    subprocess.run([sys.executable, str(COURSE / "build-private-runtime-candidate.py"), "--check"],
                   cwd=ROOT, check=True, capture_output=True)
    subprocess.run([sys.executable, str(COURSE / "build-private-dictionary-candidates.py"), "--check"],
                   cwd=ROOT, check=True, capture_output=True)
    runtime_bytes, dictionary_bytes = RUNTIME.read_bytes(), DICTIONARY.read_bytes()
    page = render(json.loads(runtime_bytes), json.loads(dictionary_bytes))
    page_bytes = page.encode("utf-8")
    evidence = {"schema": 1, "pairKey": "Japanese:English", "lessons": 60,
                "reviewed": False, "registered": False,
                "runtimeSha256": digest(runtime_bytes), "dictionarySha256": digest(dictionary_bytes),
                "pageSha256": digest(page_bytes), "pageBytes": len(page_bytes),
                "privatePage": str(args.output)}
    evidence_text = json.dumps(evidence, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not args.output.is_file() or args.output.read_bytes() != page_bytes or not args.evidence.is_file() or args.evidence.read_text() != evidence_text:
            raise SystemExit("Private Japanese Lunch content review packet is stale")
        print("Private Japanese Lunch content review packet matches 60 current lessons")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.evidence.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(page_bytes)
        args.evidence.write_text(evidence_text)
        print(args.output)


if __name__ == "__main__":
    main()
