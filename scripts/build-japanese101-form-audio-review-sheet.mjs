#!/usr/bin/env node
// Private review sheet for exact Japanese 101 form prompts and existing HD clips.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const audioRoot = '/Users/drive/lt-audio/japanese-101';
const previewPath = resolve(repo, 'content/japanese-basics/private-form-runtime-preview-ja-en.json');
const rawPreview = readFileSync(previewPath);
const preview = JSON.parse(rawPreview);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const normalized = text => text.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
const spoken = text => text.normalize('NFC').replace(/\s+/gu, '');
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
if (preview.pairKey !== 'Japanese:English' || preview.registered !== false ||
    preview.reviewed !== false || preview.lessonCount !== 60 || preview.promptCount !== 235)
  throw new Error('Japanese 101 form source is not the expected private candidate');

const inventory = JSON.parse(readFileSync(resolve(repo, 'docs/japanese-program/audio-inventory.json')));
const manifestHashes = {};
const rows = [];
for (const lesson of preview.lessons) {
  const stage = lesson.moduleId.startsWith('foundation-') ? 'foundation'
    : lesson.moduleId.startsWith('master-') ? 'master' : 'core';
  const folder = stage === 'foundation' && lesson.lessonNumber === 1 ? 'foundation-1-complete'
    : `${stage}-${lesson.lessonNumber}`;
  const manifestBytes = readFileSync(resolve(audioRoot, folder, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.locale !== 'ja-JP' || manifest.listeningReviewed !== false ||
      manifest.sourceSHA256 !== inventory.normalizedTextSHA256 ||
      manifest.scope?.module !== lesson.moduleId || manifest.scope?.lesson !== lesson.lessonNumber ||
      manifest.voices?.female !== 'ja-JP-Chirp3-HD-Aoede' ||
      manifest.voices?.male !== 'ja-JP-Chirp3-HD-Charon')
    throw new Error(`${folder}: wrong audio source, scope, voices, or review gate`);
  manifestHashes[folder] = sha(manifestBytes);
  for (const activity of lesson.activities.filter(item => item.mode === 'produce-target')) {
    const answer = activity.answer;
    const clips = manifest.clips[normalized(answer)];
    if (!clips || Object.keys(clips).sort().join(',') !== 'female,male')
      throw new Error(`${folder}:${activity.sourcePromptId}: missing exact audio pair`);
    const audio = {};
    for (const gender of ['female', 'male']) {
      const clip = clips[gender];
      const file = resolve(audioRoot, folder, clip.name);
      const bytes = readFileSync(file);
      if (clip.voice !== manifest.voices[gender] || clip.locale !== 'ja-JP' ||
          clip.spokenText !== spoken(answer) || clip.listeningReviewed !== false ||
          clip.bytes !== bytes.length || clip.sha256 !== sha(bytes) ||
          !Number.isFinite(clip.durationSeconds) || clip.durationSeconds <= 0.1)
        throw new Error(`${folder}:${activity.sourcePromptId}:${gender}: audio identity or file changed`);
      audio[gender] = `${folder}/${clip.name}`;
    }
    rows.push({ id: activity.sourcePromptId, lesson: `${stage} ${lesson.lessonNumber}`,
                english: activity.cue, japanese: answer, audio });
  }
}
if (rows.length !== 235 || new Set(rows.map(row => row.id)).size !== 235 ||
    Object.keys(manifestHashes).length !== 60)
  throw new Error('Japanese 101 form-audio coverage count changed');
const sourceSha256 = sha(rawPreview);
const audioManifestSetSha256 = sha(JSON.stringify(Object.entries(manifestHashes).sort()));
const payload = JSON.stringify({ sourceSha256, audioManifestSetSha256, rows }).replaceAll('</', '<\\/');
const cards = rows.map(row => `<article data-id="${escape(row.id)}"><small>${escape(row.lesson)} · ${escape(row.id)}</small>
<p>${escape(row.english)}</p><p class="jp" lang="ja">${escape(row.japanese)}</p>
${['female', 'male'].map(gender => `<label>${gender === 'female' ? 'Aoede' : 'Charon'}<audio controls preload="none" src="${escape(row.audio[gender])}"></audio><select data-voice="${gender}"><option value="">Unreviewed</option><option value="accept">Accept</option><option value="retake">Retake</option></select></label>`).join('')}
<label>Notes<textarea></textarea></label></article>`).join('\n');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Japanese 101 form audio review</title>
<style>body{font:16px system-ui;max-width:1000px;margin:auto;padding:1rem;background:#f8fafc;color:#14212d}header{position:sticky;top:0;background:#f8fafc;padding:.6rem;border-bottom:1px solid #ccd;z-index:1}article{background:#fff;border:1px solid #ccd;border-radius:12px;padding:1rem;margin:1rem 0}label{display:block;margin:.6rem 0}audio{display:block;max-width:100%;width:320px;margin:.3rem 0}select,textarea,button{font:inherit;padding:.4rem}textarea{display:block;width:min(96%,700px);min-height:3rem}.jp{font-size:1.4rem}small{color:#445}button{min-height:44px}</style>
<header><h1>Japanese 101 form audio review</h1><p>235 source-linked form prompts · two voices each · private review only. Decisions here do not register recordings or mark the course reviewed.</p><label>Reviewer <input id="reviewer"></label><button id="export">Export decisions JSON</button><small id="count"></small></header>
<main>${cards}</main><script>const data=${payload};const key='lt-ja101-form-audio-'+data.sourceSha256+'-'+data.audioManifestSetSha256;let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{};const reviewer=document.getElementById('reviewer');reviewer.value=saved.reviewer||'';function persist(){saved.reviewer=reviewer.value;localStorage.setItem(key,JSON.stringify(saved));count()}function count(){let n=0;for(const row of data.rows){const d=saved[row.id]||{};n+=d.female==='accept';n+=d.male==='accept'}document.getElementById('count').textContent=n+' of '+(data.rows.length*2)+' voice placements accepted'}reviewer.oninput=persist;for(const card of document.querySelectorAll('article')){const id=card.dataset.id;const prior=saved[id]||{};for(const select of card.querySelectorAll('select')){const voice=select.dataset.voice;select.value=prior[voice]||'';select.onchange=()=>{saved[id]={...(saved[id]||{}),[voice]:select.value,notes:card.querySelector('textarea').value};persist()}}const notes=card.querySelector('textarea');notes.value=prior.notes||'';notes.oninput=()=>{saved[id]={...(saved[id]||{}),notes:notes.value};persist()}}document.getElementById('export').onclick=()=>{persist();const decisions=Object.fromEntries(data.rows.map(row=>[row.id,saved[row.id]||{female:'',male:'',notes:''}]));const out={schema:1,pairKey:'Japanese:English',sourceSha256:data.sourceSha256,audioManifestSetSha256:data.audioManifestSetSha256,reviewer:reviewer.value,exportedAt:new Date().toISOString(),decisions};const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='japanese101-form-audio-review-'+data.audioManifestSetSha256.slice(0,12)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};count();</script></html>`;
const output = resolve(audioRoot, 'form-audio-review-2026-11-09.html');
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== html) throw new Error('Japanese form audio review sheet needs regeneration');
} else {
  writeFileSync(output, html);
}
console.log(`Japanese 101 private form audio: ${rows.length} prompts, ${rows.length * 2} source-matched voice placements`);
