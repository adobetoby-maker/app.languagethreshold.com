#!/usr/bin/env python3
"""Verify and render the private Japanese Roofing Foundation 1 listening sheet."""

import hashlib
import html
import json
from pathlib import Path

from importlib.machinery import SourceFileLoader

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path("/Users/drive/lt-audio/japanese-roofing/foundation-1")
GENERATOR = SourceFileLoader("roofing_audio", str(ROOT / "scripts/generate-japanese-roofing-hd-audio.py")).load_module()


def safe(value):
    return html.escape(str(value), quote=True)


def main():
    inventory_path = ROOT / "content/japanese-roofing/audio-inventory.json"
    inventory = json.loads(inventory_path.read_text())
    manifest_path = AUDIO / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    if manifest["sourceInventorySHA256"] != hashlib.sha256(inventory_path.read_bytes()).hexdigest():
        raise ValueError("Pilot source inventory changed")
    if manifest["stringsSHA256"] != inventory["stringsSHA256"]:
        raise ValueError("Pilot text inventory changed")
    if manifest["pairKey"] != "Japanese:English" or manifest["locale"] != "ja-JP" or manifest["voices"] != GENERATOR.VOICES:
        raise ValueError("Pilot language or voice identity changed")
    if manifest.get("quotaProject") != "project-91661021-fb2d-4524-b9f":
        raise ValueError("Pilot quota project changed")
    if manifest["scope"] != "pilot" or not isinstance(manifest["listeningReviewed"], bool) or manifest["registered"] is not False:
        raise ValueError("Pilot release state changed")
    if manifest["listeningReviewed"] and (manifest.get("listeningReview", {}).get("reviewer") != "owner" or manifest["listeningReview"].get("decision") != "accepted-all-pilot-clips"):
        raise ValueError("Pilot listening approval provenance changed")
    if set(manifest["clips"]) != set(GENERATOR.PILOT_TEXTS):
        raise ValueError("Pilot text coverage changed")
    rows = []
    for text in GENERATOR.PILOT_TEXTS:
        for gender, voice in GENERATOR.VOICES.items():
            record = manifest["clips"][text][gender]
            path = AUDIO / record["name"]
            if not GENERATOR.valid_existing(path, record, inventory["strings"][text]["spokenText"], voice):
                raise ValueError(f"Pilot clip changed: {path}")
            rows.append((text, gender, record))
    parts = ["<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>",
             "<title>Japanese Roofing Foundation 1 listening review</title>",
             "<style>body{font:16px system-ui,sans-serif;max-width:920px;margin:auto;padding:20px;background:#102031;color:#fff}section{border:1px solid #586b80;border-radius:12px;padding:15px;margin:14px 0}audio{width:100%}select,textarea,button,input{font:inherit;padding:8px}textarea{width:95%}small{overflow-wrap:anywhere;color:#c7d5df}button{cursor:pointer}</style>",
             "<h1>Japanese Roofing · Foundation 1 pilot</h1>",
             "<p>Listen to each new recording and choose accept or retake. The clips are private and unreviewed. This page saves no approval to the app or manifest.</p>",
             f"<p>Source inventory SHA-256: <code>{safe(manifest['sourceInventorySHA256'])}</code></p>",
             f"<p>Manifest SHA-256: <code>{hashlib.sha256(manifest_path.read_bytes()).hexdigest()}</code></p>",
             "<label>Reviewer <input id='reviewer'></label>"]
    for index, (text, gender, record) in enumerate(rows):
        parts.append(f"<section><h2>{safe(text)} · {safe(gender)}</h2>")
        parts.append(f"<audio controls preload='none' src='{safe(record['name'])}'></audio>")
        parts.append(f"<p><small>{safe(record['voice'])} · {safe(record['durationSeconds'])} s · SHA-256 {safe(record['sha256'])}</small></p>")
        parts.append(f"<label>Decision <select id='decision-{index}'><option value=''>Choose</option><option value='accept'>Accept</option><option value='retake'>Retake</option></select></label> ")
        parts.append(f"<label>Notes <textarea id='note-{index}' rows='2'></textarea></label></section>")
    parts.append("<button id='export'>Download decisions JSON</button><script>")
    parts.append("const clips=" + json.dumps([{"text": text, "gender": gender, "file": record["name"], "sha256": record["sha256"]} for text, gender, record in rows], ensure_ascii=False) + ";")
    parts.append("document.getElementById('export').onclick=()=>{const decisions=clips.map((clip,i)=>({...clip,decision:document.getElementById(`decision-${i}`).value,note:document.getElementById(`note-${i}`).value}));if(decisions.some(x=>!x.decision)){alert('Choose a decision for every clip.');return;}const data={reviewer:document.getElementById('reviewer').value,manifestSHA256:'" + hashlib.sha256(manifest_path.read_bytes()).hexdigest() + "',decisions};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='japanese-roofing-foundation-1-listening-decisions.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};")
    parts.append("</script></html>")
    output = AUDIO / "listening-review-2026-11-09.html"
    output.write_text("\n".join(parts))
    print(json.dumps({"verifiedClips": len(rows), "listeningReviewed": manifest["listeningReviewed"], "sheet": str(output)}))


if __name__ == "__main__":
    main()
