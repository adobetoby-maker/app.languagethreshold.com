#!/usr/bin/env node
// Private listening review for source-linked katakana contrast words.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const audioRoot = '/Users/drive/lt-audio/japanese-101';
const fixtureBytes = readFileSync(resolve(repo, 'content/japanese-basics/private-katakana-contrasts-ja-en.json'));
const fixture = JSON.parse(fixtureBytes);
const inventory = JSON.parse(readFileSync(resolve(repo, 'docs/japanese-program/audio-inventory.json')));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = text => text.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
const spoken = text => text.normalize('NFC').replace(/\s+/gu, '');
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
if (fixture.pairKey !== 'Japanese:English' || fixture.registered !== false ||
    fixture.reviewed !== false || fixture.unitCount !== 3 || fixture.activityCount !== 7)
  throw new Error('Katakana contrast fixture identity or private gate changed');

const rows = [];
const manifestHashes = {};
for (const unit of fixture.units) {
  for (const example of unit.sourceExamples) {
    const match = /^(foundation-|master-)?japanese-basics:(\d+)$/.exec(example.sourceLessonKey);
    if (!match) throw new Error(`${example.id}: invalid lesson key`);
    const stage = match[1] ? match[1].slice(0, -1) : 'core';
    const lesson = Number(match[2]);
    const folder = `${stage}-${lesson}`;
    const sourceBytes = readFileSync(resolve(repo, fixture.sourceFiles[stage].path));
    if (hash(sourceBytes) !== fixture.sourceFiles[stage].sha256)
      throw new Error(`${stage}: source hash changed`);
    const source = JSON.parse(sourceBytes);
    if (source.lessons[lesson - 1].terms[example.sourceTermIndex] !== `${example.kana}|${example.english}`)
      throw new Error(`${example.id}: source pair changed`);
    const manifestBytes = readFileSync(resolve(audioRoot, folder, 'manifest.json'));
    const manifest = JSON.parse(manifestBytes);
    if (manifest.locale !== 'ja-JP' || manifest.listeningReviewed !== false ||
        manifest.sourceSHA256 !== inventory.normalizedTextSHA256 ||
        manifest.scope?.module !== `${match[1] || ''}japanese-basics` ||
        manifest.scope?.lesson !== lesson ||
        manifest.voices?.female !== 'ja-JP-Chirp3-HD-Aoede' ||
        manifest.voices?.male !== 'ja-JP-Chirp3-HD-Charon')
      throw new Error(`${folder}: audio manifest identity or private gate changed`);
    manifestHashes[folder] = hash(manifestBytes);
    const clips = manifest.clips[normalize(example.kana)];
    if (!clips || Object.keys(clips).sort().join(',') !== 'female,male')
      throw new Error(`${example.id}: exact two-voice pair missing`);
    const audio = {};
    for (const gender of ['female', 'male']) {
      const clip = clips[gender];
      const bytes = readFileSync(resolve(audioRoot, folder, clip.name));
      if (clip.voice !== manifest.voices[gender] || clip.locale !== 'ja-JP' ||
          clip.spokenText !== spoken(example.kana) || clip.listeningReviewed !== false ||
          clip.bytes !== bytes.length || clip.sha256 !== hash(bytes) ||
          !Number.isFinite(clip.durationSeconds) || clip.durationSeconds <= 0.1)
        throw new Error(`${example.id}:${gender}: exact audio or file changed`);
      audio[gender] = `${folder}/${clip.name}`;
    }
    rows.push({ id: example.id, lesson: `${stage} ${lesson}`, focus: unit.focus,
                japanese: example.kana, english: example.english, audio });
  }
}
if (rows.length !== 6 || new Set(rows.map(row => row.id)).size !== 6)
  throw new Error('Expected six distinct katakana contrast source examples');
const sourceSha256 = hash(fixtureBytes);
const audioManifestSetSha256 = hash(JSON.stringify(Object.entries(manifestHashes).sort()));
const payload = JSON.stringify({ sourceSha256, audioManifestSetSha256, rows }).replaceAll('</', '<\\/');
const cards = rows.map(row => `<article data-id="${escape(row.id)}"><small>${escape(row.focus)} · ${escape(row.lesson)}</small>
<p lang="ja" class="jp">${escape(row.japanese)}</p><p>${escape(row.english)}</p>
${['female', 'male'].map(gender => `<label>${gender === 'female' ? 'Aoede' : 'Charon'}<audio controls preload="none" src="${escape(row.audio[gender])}"></audio><select data-voice="${gender}"><option value="">Unreviewed</option><option value="accept">Accept</option><option value="retake">Retake</option></select></label>`).join('')}
<label>Notes<textarea></textarea></label></article>`).join('\n');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Japanese 101 katakana contrast audio review</title>
<style>body{font:16px system-ui;max-width:900px;margin:auto;padding:1rem;background:#f8fafc;color:#14212d}article{background:#fff;border:1px solid #ccd;border-radius:12px;padding:1rem;margin:1rem 0}label{display:block;margin:.7rem 0}audio{display:block;width:320px;max-width:100%;margin:.3rem 0}select,textarea,button,input{font:inherit;padding:.4rem}textarea{display:block;width:min(96%,700px);min-height:3rem}.jp{font-size:1.5rem}small{color:#445}button{min-height:44px}</style>
<h1>Japanese 101 katakana contrast audio</h1><p>Six exact source words, two voices each. Private review only; decisions do not install audio or approve the course.</p><label>Reviewer <input id="reviewer"></label><button id="export">Export decisions JSON</button><p id="count"></p><main>${cards}</main>
<script>const data=${payload};const key='lt-ja101-katakana-audio-'+data.sourceSha256+'-'+data.audioManifestSetSha256;let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{};const reviewer=document.getElementById('reviewer');reviewer.value=saved.reviewer||'';function persist(){saved.reviewer=reviewer.value;localStorage.setItem(key,JSON.stringify(saved));count()}function count(){let n=0;for(const row of data.rows){const d=saved[row.id]||{};n+=d.female==='accept';n+=d.male==='accept'}document.getElementById('count').textContent=n+' of 12 voice placements accepted'}reviewer.oninput=persist;for(const card of document.querySelectorAll('article')){const id=card.dataset.id;const prior=saved[id]||{};for(const select of card.querySelectorAll('select')){const voice=select.dataset.voice;select.value=prior[voice]||'';select.onchange=()=>{saved[id]={...(saved[id]||{}),[voice]:select.value,notes:card.querySelector('textarea').value};persist()}}const notes=card.querySelector('textarea');notes.value=prior.notes||'';notes.oninput=()=>{saved[id]={...(saved[id]||{}),notes:notes.value};persist()}}document.getElementById('export').onclick=()=>{persist();const decisions=Object.fromEntries(data.rows.map(row=>[row.id,saved[row.id]||{female:'',male:'',notes:''}]));const out={schema:1,pairKey:'Japanese:English',sourceSha256:data.sourceSha256,audioManifestSetSha256:data.audioManifestSetSha256,reviewer:reviewer.value,exportedAt:new Date().toISOString(),decisions};const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='japanese101-katakana-audio-review-'+data.audioManifestSetSha256.slice(0,12)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};count();</script></html>`;
const output = resolve(audioRoot, 'katakana-contrast-audio-review-2026-11-09.html');
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== html) throw new Error('Katakana audio review sheet needs regeneration');
} else writeFileSync(output, html);
console.log(`Japanese 101 katakana audio: ${rows.length} source words, ${rows.length * 2} voice placements`);
