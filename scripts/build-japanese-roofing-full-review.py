#!/usr/bin/env python3
"""Verify and render private listening worksheets for all Japanese Roofing lessons."""

import argparse
import hashlib
import html
import json
import subprocess
import sys
from importlib.machinery import SourceFileLoader
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENERATOR = SourceFileLoader("roofing_audio", str(ROOT / "scripts/generate-japanese-roofing-hd-audio.py")).load_module()
INVENTORY = ROOT / "content/japanese-roofing/audio-inventory.json"
AUDIO = Path("/Users/drive/lt-audio/japanese-roofing/full-course-2026-11-09")
STAGES = (("foundation", "foundation-roofing", 10), ("core", "roofing", 30), ("master", "master-roofing", 20))


def safe(value):
    return html.escape(str(value), quote=True)


def render_lesson(stage, number, rows, manifest_hash):
    body = ["<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>",
            f"<title>Japanese Roofing {safe(stage)} {number} listening review</title>",
            "<style>body{font:16px system-ui,sans-serif;max-width:950px;margin:auto;padding:20px;background:#102031;color:#fff}section{border:1px solid #586b80;border-radius:12px;padding:15px;margin:14px 0}audio{width:100%}select,textarea,button,input{font:inherit;padding:8px}textarea{width:95%}small{overflow-wrap:anywhere;color:#c7d5df}a{color:#eecb8a}button{cursor:pointer}</style>",
            "<p><a href='index.html'>← All lessons</a></p>", f"<h1>Japanese Roofing · {safe(stage.title())} {number}</h1>",
            "<p>Private recordings awaiting fluent listening. Choose accept or retake for every voice. Exported decisions do not change app playback, lesson review, or manifest flags.</p>",
            f"<p>Manifest SHA-256: <code>{safe(manifest_hash)}</code></p>",
            "<label>Reviewer <input id='reviewer'></label>"]
    decisions = []
    for index, (text, surfaces, gender, record) in enumerate(rows):
        body.extend((f"<section><h2>{safe(text)} · {safe(gender)}</h2>",
                     f"<p>Lesson use: {safe(', '.join(surfaces))}</p>",
                     f"<audio controls preload='none' src='../{safe(record['name'])}'></audio>",
                     f"<p><small>{safe(record['voice'])} · {safe(record['durationSeconds'])} s · SHA-256 {safe(record['sha256'])}</small></p>",
                     f"<label>Decision <select id='decision-{index}'><option value=''>Choose</option><option value='accept'>Accept</option><option value='retake'>Retake</option></select></label> ",
                     f"<label>Notes <textarea id='note-{index}' rows='2'></textarea></label></section>"))
        decisions.append({"text": text, "surfaces": surfaces, "gender": gender, "file": record["name"], "sha256": record["sha256"]})
    serialized = json.dumps(decisions, ensure_ascii=False).replace("</", "<\\/")
    body.append("<button id='export'>Download decisions JSON</button><script>const clips=" + serialized + ";")
    body.append("document.getElementById('export').onclick=()=>{const decisions=clips.map((clip,i)=>({...clip,decision:document.getElementById(`decision-${i}`).value,note:document.getElementById(`note-${i}`).value}));if(decisions.some(x=>!x.decision)){alert('Choose a decision for every clip.');return;}const data={reviewer:document.getElementById('reviewer').value,manifestSHA256:'" + manifest_hash + "',decisions};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='japanese-roofing-" + stage + "-" + str(number) + "-listening-decisions.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};</script></html>")
    return "\n".join(body)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-root", type=Path, default=AUDIO)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    subprocess.run([sys.executable, str(ROOT / "scripts/audit-japanese-roofing-audio.py"), "--check"],
                   check=True, capture_output=True, text=True)
    inventory_bytes = INVENTORY.read_bytes()
    inventory = json.loads(inventory_bytes)
    manifest_path = args.audio_root / "manifest.json"
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    if manifest["sourceInventorySHA256"] != hashlib.sha256(inventory_bytes).hexdigest() or manifest["stringsSHA256"] != inventory["stringsSHA256"]:
        raise ValueError("Full-course source inventory changed")
    if manifest["pairKey"] != "Japanese:English" or manifest["locale"] != "ja-JP" or manifest["voices"] != GENERATOR.VOICES:
        raise ValueError("Full-course language or voice identity changed")
    if manifest.get("quotaProject") != "project-91661021-fb2d-4524-b9f":
        raise ValueError("Full-course quota project changed")
    if manifest["scope"] != "all" or manifest["listeningReviewed"] is not False or manifest["registered"] is not False:
        raise ValueError("Full-course scope or release gate changed")
    if set(manifest["clips"]) != set(inventory["strings"]):
        raise ValueError("Full-course text coverage is incomplete")
    for text, variants in manifest["clips"].items():
        if set(variants) != set(GENERATOR.VOICES):
            raise ValueError(f"Voice coverage is incomplete: {text}")
        for gender, voice in GENERATOR.VOICES.items():
            record = variants[gender]
            if not GENERATOR.valid_existing(args.audio_root / record["name"], record, inventory["strings"][text]["spokenText"], voice):
                raise ValueError(f"Clip changed: {record['name']}")
            if record.get("listeningReviewed") is not False:
                raise ValueError(f"Clip review gate changed: {record['name']}")
    output = args.output or args.audio_root / "listening-review"
    output.mkdir(parents=True, exist_ok=True)
    manifest_hash = hashlib.sha256(manifest_bytes).hexdigest()
    index = ["<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>",
             "<title>Japanese Roofing private listening review</title><style>body{font:16px system-ui,sans-serif;max-width:800px;margin:auto;padding:20px;background:#102031;color:#fff}a{color:#eecb8a}</style>",
             "<h1>Japanese Roofing · 60 private lesson listening sheets</h1>",
             "<p>Recordings and decisions are private. Existing approval of other French or Japanese pilots does not approve these clips.</p>"]
    placements = 0
    for stage, module, count in STAGES:
        index.append(f"<h2>{safe(stage.title())}</h2><ul>")
        for number in range(1, count + 1):
            lesson_id = f"{module}:{number}:ja-en"
            rows = [(text, entry["surfaces"], gender, manifest["clips"][text][gender])
                    for text, entry in inventory["strings"].items() if lesson_id in entry["lessonIds"]
                    for gender in GENERATOR.VOICES]
            if not rows:
                raise ValueError(f"No audio for {lesson_id}")
            placements += len(rows)
            name = f"{stage}-{number}.html"
            (output / name).write_text(render_lesson(stage, number, rows, manifest_hash))
            index.append(f"<li><a href='{name}'>{safe(stage.title())} {number}</a> · {len(rows)} clip placements</li>")
        index.append("</ul>")
    index.append(f"<p>{placements} lesson-clip placements; {len(inventory['strings']) * 2} distinct text/voice clips.</p></html>")
    (output / "index.html").write_text("\n".join(index))
    print(json.dumps({"lessons": 60, "distinctClips": len(inventory["strings"]) * 2,
                      "lessonClipPlacements": placements, "listeningReviewed": False, "index": str(output / "index.html")}))


if __name__ == "__main__":
    main()
